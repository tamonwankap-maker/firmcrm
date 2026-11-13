import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { ADMIN, DEMO_PASSWORD, loginOk } from "./helpers";

test.describe.configure({ mode: "serial" });

test("BD sees the firm overview and exports the pipeline to Excel and PDF", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Firm overview" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Weighted pipeline by stage" })).toBeVisible();

  await page.getByRole("link", { name: /Open pipeline/ }).click();
  await expect(page.getByRole("heading", { name: "Open pipeline" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "THB 5bn debenture programme" })).toBeVisible();
  // Ploy (BD) is on the Project Sunrise team, so the confidential deal is included for her.
  await expect(page.getByRole("cell", { name: /Project Sunrise/ })).toBeVisible();

  const [xlsx] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Excel" }).click()]);
  expect(xlsx.suggestedFilename()).toBe("pipeline.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(await xlsx.path());
  expect(wb.worksheets[0].getRow(1).getCell(1).value).toBe("Open pipeline");

  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "PDF" }).click()]);
  expect(pdf.suggestedFilename()).toBe("pipeline.pdf");
});

test("exports are recorded in the audit log", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/audit?action=EXPORT");
  await expect(page.getByRole("cell", { name: /Report/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ploy Srisuk" }).first()).toBeVisible();
});

test("partners have no PDPA list; viewers have no reports", async ({ page }) => {
  await loginOk(page, "partner2@example.com", DEMO_PASSWORD);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Firm overview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Mailing list/ })).toHaveCount(0);
  await page.goto("/reports/consent");
  await expect(page).toHaveURL(/no-access/);
  expect((await page.request.get("/api/export/consent?format=xlsx")).status()).toBe(403);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await page.goto("/reports");
  await expect(page).toHaveURL(/no-access/);
});
