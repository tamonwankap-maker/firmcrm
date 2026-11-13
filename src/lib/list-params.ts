import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;

/** Common list query params: ?page=&q=&archived= */
export const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  q: z
    .string()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => v?.trim() || undefined),
  archived: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
});

export function pageArgs(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Optional enum filter from a query string; invalid values are ignored. */
export const zOptEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

/** Optional id filter. */
export const zOptFilterId = z
  .string()
  .max(40)
  .optional()
  .catch(undefined)
  .transform((v) => v || undefined);
