import "server-only";
import type { Role } from "@/server/auth/policy";
import type { ReportDef } from "./types";
import { pipelineReport } from "./definitions/pipeline";
import { winLossReport } from "./definitions/win-loss";
import { sourcesReport } from "./definitions/sources";
import { activityReport } from "./definitions/activity";
import { rankingsReport } from "./definitions/rankings";
import { eventsReport } from "./definitions/events";
import { consentReport } from "./definitions/consent";

export const REPORTS: ReportDef[] = [
  pipelineReport,
  winLossReport,
  sourcesReport,
  activityReport,
  rankingsReport,
  eventsReport,
  consentReport,
];

export function reportsFor(role: Role): ReportDef[] {
  return REPORTS.filter((r) => r.roles.includes(role));
}

export function getReport(id: string): ReportDef | undefined {
  return REPORTS.find((r) => r.id === id);
}
