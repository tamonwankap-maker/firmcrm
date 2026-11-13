import "server-only";
import { withAudit, type AuditContext } from "@/server/audit";
import { assertCan, type Actor } from "@/server/auth/policy";
import { UserFacingError } from "@/server/actions/result";
import { todayInBangkok } from "@/lib/dates";
import type { ConsentInput } from "./schema";

/** Upsert a contact's consent for one list. Every change is audited (PDPA history). */
export async function saveConsent(actor: Actor, input: ConsentInput, ctx: AuditContext) {
  assertCan(actor, "update", "MailingConsent");
  return withAudit(ctx, async (tx) => {
    const contact = await tx.contact.findUnique({ where: { id: input.contactId }, select: { id: true } });
    if (!contact) throw new UserFacingError("Contact not found.");
    const before = await tx.mailingConsent.findUnique({
      where: { contactId_list: { contactId: input.contactId, list: input.list } },
    });
    const optedIn = input.status === "IN";
    let withdrawnDate: Date | null = null;
    if (!optedIn) {
      withdrawnDate = input.withdrawnDate ?? todayInBangkok();
      if (withdrawnDate < input.consentDate) withdrawnDate = input.consentDate;
    }
    const data = {
      optedIn,
      consentDate: input.consentDate,
      withdrawnDate,
      source: input.source,
      evidenceNote: input.evidenceNote,
    };
    const after = await tx.mailingConsent.upsert({
      where: { contactId_list: { contactId: input.contactId, list: input.list } },
      create: { contactId: input.contactId, list: input.list, ...data },
      update: data,
    });
    return {
      result: after,
      audit: [
        {
          action: before ? "UPDATE" : "CREATE",
          entity: "MailingConsent",
          entityId: after.id,
          before,
          after,
          meta: { contactId: input.contactId, list: input.list },
        },
      ],
    };
  });
}
