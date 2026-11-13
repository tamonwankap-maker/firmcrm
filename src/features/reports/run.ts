import "server-only";
import { db } from "@/server/db";
import { ForbiddenError, type Actor } from "@/server/auth/policy";
import { describeParams, paramsToQuery } from "./params";
import { getReport } from "./registry";
import type { ReportDef, ReportParams, ReportResult } from "./types";

export interface RanReport {
  def: ReportDef;
  result: ReportResult;
  subtitle: string;
  query: string;
}

/** Look up a report, enforce its role list, run it, and describe its parameters. */
export async function runReport(actor: Actor, id: string, params: ReportParams): Promise<RanReport | null> {
  const def = getReport(id);
  if (!def) return null;
  if (!def.roles.includes(actor.role)) throw new ForbiddenError();
  const practiceName = params.practice
    ? (await db.practiceArea.findUnique({ where: { id: params.practice }, select: { name: true } }))?.name
    : undefined;
  const result = await def.run(actor, params);
  return {
    def,
    result,
    subtitle: describeParams(params, def.params, practiceName),
    query: paramsToQuery(params, def.params),
  };
}
