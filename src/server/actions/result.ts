import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ForbiddenError } from "@/server/auth/policy";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /** Possible duplicate records; the form can offer "create anyway". */
      duplicates?: DuplicateMatch[];
      /** Non-blocking warnings: re-submit with confirm=on to proceed. */
      warnings?: string[];
    };

export interface DuplicateMatch {
  id: string;
  label: string;
  sub?: string;
  href: string;
}

/** Thrown when an action needs the user to acknowledge warnings first. */
export class ConfirmRequiredError extends Error {
  constructor(public warnings: string[]) {
    super("Please confirm to continue.");
    this.name = "ConfirmRequiredError";
  }
}

/** Thrown when a create looks like an existing record and the user has not confirmed. */
export class DuplicateError extends Error {
  constructor(public matches: DuplicateMatch[]) {
    super("This looks like an existing record.");
    this.name = "DuplicateError";
  }
}

/** Known business-rule failure with a user-facing message. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

/**
 * Wrap a server action body: converts validation / permission / business errors into a
 * serialisable ActionResult and lets Next.js redirects pass through.
 */
export async function runAction<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: z.flattenError(err).fieldErrors,
      };
    }
    if (err instanceof ForbiddenError) return { ok: false, error: err.message };
    if (err instanceof ConfirmRequiredError) {
      return { ok: false, error: "Please review the warning below and confirm.", warnings: err.warnings };
    }
    if (err instanceof DuplicateError) {
      return {
        ok: false,
        error: "Possible duplicate — please check before creating a new record.",
        duplicates: err.matches,
      };
    }
    if (err instanceof UserFacingError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    if (isUniqueViolation(err)) return { ok: false, error: "A record with these details already exists." };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** FormData → plain object; repeated keys become arrays. */
export function formToObject(form: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = all.length > 1 || key.endsWith("[]") ? all : (all[0] ?? "");
  }
  return out;
}
