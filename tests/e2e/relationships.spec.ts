import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { DEMO_PASSWORD, appAlert, loginOk, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

async function pick(page: import("@playwright/test").Page, inputId: string, text: string, option: string | RegExp) {
  await page.locator(`#${inputId}`).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

test("BD creates an organisation (Thai name), sees duplicate warning, adds contact, consent and activity", async ({
  page,
}) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);

  await page.goto("/organisations/new");
  await page.getByLabel("Name (English)").fill("Kasikorn Example Public Company Limited");
  await page.getByLabel(/Name \(Thai\)/).fill("ธนาคารกสิกรตัวอย่าง จำกัด (มหาชน)");
  await page.getByLabel("Type").selectOption("CLIENT");
  await pick(page, "relationshipPartnerId", "Somchai", /Somchai Wongsakul/);
  await page.getByLabel("Key client").check();
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByRole("heading", { name: "Kasikorn Example Public Company Limited" })).toBeVisible();
  const orgUrl = page.url();

  // Duplicate check (legal form differs)
  await page.goto("/organisations/new");
  await page.getByLabel("Name (English)").fill("KASIKORN EXAMPLE PCL");
  await page.getByLabel("Type").selectOption("CLIENT");
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByText("Possible duplicate. These records already exist:")).toBeVisible();
  await expect(page.getByLabel("Name (English)")).toHaveValue("KASIKORN EXAMPLE PCL"); // input kept

  // Contact
  await page.goto(orgUrl);
  await page.getByRole("link", { name: "Add" }).click();
  await page.getByLabel("Name (English)").fill("Malee Suksawat");
  await page.getByLabel(/Name \(Thai\)/).fill("มาลี สุขสวัสดิ์");
  await page.getByLabel("Job title").fill("Head of Legal");
  await page.getByLabel("Email").fill("malee@kbank.example");
  await page.getByLabel("Tags").fill("GC, Banking");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { name: "Malee Suksawat" })).toBeVisible();
  // Match the link: Next's hidden route announcer can also contain the page title text.
  await expect(page.getByRole("link", { name: "Kasikorn Example Public Company Limited" })).toBeVisible();

  // PDPA consent
  await page.getByRole("button", { name: "Record" }).first().click();
  await page.getByLabel("Evidence").fill("Signed form at seminar");
  await page.getByRole("button", { name: "Save consent" }).click();
  await expect(page.locator("span").filter({ hasText: /^Opted in$/ })).toBeVisible();

  // Activity with overdue next action
  await page.getByRole("link", { name: "Log activity" }).click();
  await page.getByLabel("Type").selectOption("MEETING");
  await page.getByLabel("Summary").fill("ประชุมเรื่องการออกหุ้นกู้ — discussed bond issuance timetable");
  await page.getByLabel("Next action").fill("Send engagement letter");
  await page.getByLabel("Due").fill("2026-01-05");
  await page.getByLabel("Capital Markets").check();
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByRole("heading", { name: "Malee Suksawat" })).toBeVisible();
  await expect(page.getByText("discussed bond issuance timetable")).toBeVisible();
  await expect(page.getByText(/Overdue · 05 Jan 2026/)).toBeVisible();

  // Dashboard shows it; completing it clears the overdue count
  await page.goto("/dashboard");
  const nextActions = page.locator("#next-actions");
  await expect(nextActions.getByText("Send engagement letter")).toBeVisible();
  await nextActions.getByRole("checkbox", { name: "Mark next action done" }).check();
  await expect(page.getByRole("link", { name: /Overdue next actions\s*0/ })).toBeVisible();
});

test("global search finds Thai text inside unspaced names", async ({ page }) => {
  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await page.getByRole("searchbox", { name: "Search" }).fill("กสิกร");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Kasikorn Example Public Company Limited" })).toBeVisible();
  await page.goto("/search?q=" + encodeURIComponent("สุขสวัสดิ์"));
  await expect(page.getByRole("link", { name: "Malee Suksawat" })).toBeVisible();
});

test("permissions: partner edits only own records; viewer is read-only", async ({ page }) => {
  await loginOk(page, "partner2@example.com", DEMO_PASSWORD);
  await page.goto("/organisations?q=Kasikorn");
  await page.getByRole("link", { name: "Kasikorn Example Public Company Limited" }).click();
  await expect(page).toHaveURL(/\/organisations\/c[a-z0-9]+$/);
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0); // relationship partner is Somchai
  await page.goto(page.url() + "/edit");
  await expect(page).toHaveURL(/no-access/);

  await logout(page);
  await loginOk(page, "partner@example.com", DEMO_PASSWORD);
  await page.goto("/organisations?q=Kasikorn");
  await page.getByRole("link", { name: "Kasikorn Example Public Company Limited" }).click();
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();

  await logout(page);
  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await page.goto("/organisations");
  await expect(page.getByRole("link", { name: "New organisation" })).toHaveCount(0);
  await page.goto("/import");
  await expect(page).toHaveURL(/no-access/);
});

test("tasks: quick add and complete", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/tasks");
  await page.getByLabel("Task title").fill("Chase Chambers referee list");
  await page.getByLabel("Due date").fill("2026-12-01");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Chase Chambers referee list")).toBeVisible();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/tasks"));
  await page.getByRole("checkbox", { name: "Complete Chase Chambers referee list" }).check();
  await saved; // server action finished
  await page.reload();
  await expect(page.getByText("Chase Chambers referee list")).toHaveCount(0); // open filter hides done
});

test("import contacts from Excel with preview, PDPA confirmation and duplicate skipping", async ({
  page,
}, testInfo) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Contacts");
  ws.addRow(["Name (EN)", "Name (TH)", "Organisation", "Email", "Newsletter consent"]);
  ws.addRow(["Anan Prasert", "อนันต์ ประเสริฐ", "Kasikorn Example PCL", "anan@kbank.example", "Yes"]);
  ws.addRow(["Wipa Chai", "วิภา ชัย", "Bangkok Logistics Co., Ltd.", "wipa@bkl.example", ""]);
  ws.addRow(["Malee again", "", "", "MALEE@kbank.example", ""]); // duplicate email
  const file = testInfo.outputPath("contacts.xlsx");
  await wb.xlsx.writeFile(file);

  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/import?type=contacts");
  const template = await page.request.get("/api/import/template?type=contacts");
  expect(template.headers()["content-type"]).toContain("spreadsheetml");

  await page.getByLabel(/^File/).setInputFiles(file);
  await page.getByRole("button", { name: "Check file" }).click();
  await expect(page.getByText("2 to import")).toBeVisible();
  await expect(page.getByText("1 duplicate (skipped)")).toBeVisible();
  await expect(page.getByText("1 new organisation")).toBeVisible();

  await page.getByRole("button", { name: "Import 2 contacts" }).click();
  await expect(appAlert(page)).toContainText("confirm that the consent columns");
  await page.getByText(/reflect real consent/).click();
  await page.getByRole("button", { name: "Import 2 contacts" }).click();
  await expect(page.getByText("Imported 2 contacts and created 1 new organisation.")).toBeVisible();

  await page.goto("/contacts?q=" + encodeURIComponent("อนันต์"));
  await page.getByRole("link", { name: "Anan Prasert" }).click();
  // Match the link: Next's hidden route announcer can also contain the page title text.
  await expect(page.getByRole("link", { name: "Kasikorn Example Public Company Limited" })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: /^Opted in$/ })).toBeVisible();
});
