import ExcelJS from "exceljs";
import { getCurrentUser } from "@/server/auth/current-user";
import { CONTACT_COLUMNS, ORG_COLUMNS } from "@/features/import/columns";
import { ORG_TYPE_LABELS } from "@/features/labels";
import { db } from "@/server/db";

/** GET /api/import/template?type=organisations|contacts → .xlsx template with an instructions sheet. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "BD")) return new Response("Forbidden", { status: 403 });
  const type = new URL(req.url).searchParams.get("type") === "contacts" ? "contacts" : "organisations";
  const cols = type === "contacts" ? CONTACT_COLUMNS : ORG_COLUMNS;

  const wb = new ExcelJS.Workbook();
  wb.creator = "BD CRM";
  const ws = wb.addWorksheet(type === "contacts" ? "Contacts" : "Organisations");
  ws.addRow(cols.map((c) => c.header));
  ws.addRow(cols.map((c) => c.example));
  ws.getRow(1).font = { bold: true };
  ws.getRow(2).font = { italic: true, color: { argb: "FF888888" } };
  ws.columns.forEach((col, i) => (col.width = Math.max(14, cols[i].header.length + 4)));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const info = wb.addWorksheet("Instructions");
  info.addRow(["Column", "Required", "Notes"]).font = { bold: true };
  for (const c of cols) info.addRow([c.header, c.required ? "Yes" : "", c.help]);
  info.addRow([]);
  info.addRow(["Delete the grey example row before importing. Save as .xlsx (or CSV UTF-8)."]);
  if (type === "organisations") {
    info.addRow(["Types:", Object.values(ORG_TYPE_LABELS).join(", ")]);
    const industries = await db.industry.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    info.addRow(["Industries:", industries.map((i) => i.name).join(", ")]);
  } else {
    info.addRow([
      "PDPA:",
      "Only mark consent columns “Yes” where the person actually opted in, and keep the evidence.",
    ]);
  }
  info.columns = [{ width: 28 }, { width: 10 }, { width: 90 }];

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bd-crm-${type}-template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
