"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requestIp, requireUser } from "@/server/auth/current-user";
import { runAction, UserFacingError, type ActionResult } from "@/server/actions/result";
import { MAX_IMPORT_BYTES, readSheet } from "./read-file";
import { assertCanImport, buildPlan, commitPlan, summarise, type ImportSummary } from "./service";

const optionsSchema = z.object({
  kind: z.enum(["organisations", "contacts"]),
  createMissingOrganisations: z.preprocess((v) => v === "on", z.boolean()),
  confirmConsent: z.preprocess((v) => v === "on", z.boolean()),
});

async function loadFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Choose a file to upload.");
  if (file.size > MAX_IMPORT_BYTES) throw new UserFacingError("The file is larger than 5 MB.");
  try {
    return { name: file.name, sheet: await readSheet(file.name, Buffer.from(await file.arrayBuffer())) };
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    throw new UserFacingError(`Could not read the file: ${(e as Error).message}`);
  }
}

/** Step 1: validate and show what would happen. Nothing is written. */
export async function previewImportAction(
  _prev: ActionResult<ImportSummary> | null,
  form: FormData,
): Promise<ActionResult<ImportSummary>> {
  return runAction(async () => {
    const me = await requireUser();
    assertCanImport(me);
    const opts = optionsSchema.parse(Object.fromEntries(form));
    const { sheet } = await loadFile(form);
    const plan = await buildPlan(me, opts.kind, sheet, opts.createMissingOrganisations);
    return { ok: true, data: summarise(opts.kind, plan) };
  });
}

/** Step 2: re-read the same file, re-validate, and create the records. */
export async function commitImportAction(
  _prev: ActionResult<{ created: number; organisationsCreated: number }> | null,
  form: FormData,
): Promise<ActionResult<{ created: number; organisationsCreated: number }>> {
  const result = await runAction(async () => {
    const me = await requireUser();
    assertCanImport(me);
    const opts = optionsSchema.parse(Object.fromEntries(form));
    const { name, sheet } = await loadFile(form);
    const plan = await buildPlan(me, opts.kind, sheet, opts.createMissingOrganisations);
    if (plan.missingHeaders.length)
      throw new UserFacingError(`Missing required columns: ${plan.missingHeaders.join(", ")}`);
    if (plan.creates.length === 0)
      throw new UserFacingError("Nothing to import — every row is a duplicate or has an error.");
    if ("consentRows" in plan && plan.consentRows > 0 && !opts.confirmConsent) {
      throw new UserFacingError("Please confirm that the consent columns reflect real opt-ins (PDPA).");
    }
    const res = await commitPlan(me, opts.kind, plan, name, { userId: me.id, ip: await requestIp() });
    return { ok: true, data: res };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
