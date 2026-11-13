import { getCurrentUser, requestIp } from "@/server/auth/current-user";
import { ForbiddenError } from "@/server/auth/policy";
import { withAudit } from "@/server/audit";
import { parseReportParams } from "@/features/reports/params";
import { runReport } from "@/features/reports/run";
import { buildWorkbook } from "@/features/reports/export/excel";
import { buildPdf } from "@/features/reports/export/pdf";
import { exportFileName } from "@/features/reports/format";
import { formatDateTime } from "@/lib/dates";

/**
 * GET /api/export/<report>?format=xlsx|pdf&from=&to=&year=&practice=&list=
 * Permission-checked (report role list) and audited (CLAUDE.md rule 6).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/export/[report]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (user.mustChangePassword) return new Response("Change your password first", { status: 403 });
  const { report } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const params = parseReportParams(Object.fromEntries(url.searchParams));

  let ran;
  try {
    ran = await runReport(user, report, params);
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
  if (!ran) return new Response("Report not found", { status: 404 });

  const generatedAt = formatDateTime(new Date());
  const file = {
    title: ran.def.title,
    subtitle: ran.subtitle,
    generatedBy: user.name,
    generatedAt,
    result: ran.result,
  };
  const body = format === "pdf" ? await buildPdf(file) : await buildWorkbook(file);

  await withAudit({ userId: user.id, ip: await requestIp() }, async () => ({
    result: null,
    audit: [
      {
        action: "EXPORT",
        entity: "Report",
        entityId: report,
        meta: { format, params: ran.query, rows: ran.result.rows.length },
      },
    ],
  }));

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(report, ran.query, format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
