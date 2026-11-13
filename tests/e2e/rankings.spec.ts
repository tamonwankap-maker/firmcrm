import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, loginOk, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

async function pick(page: Page, inputId: string, text: string, option: string | RegExp) {
  await page.locator(`#${inputId}`).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

test("adding a recently-used referee shows a warning that must be confirmed", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/rankings");
  await page.getByRole("link", { name: /Chambers & Partners/ }).click();
  await expect(page).toHaveURL(/\/rankings\/submissions\/c[a-z0-9]+$/);
  const panel = page.locator("form").filter({ has: page.getByRole("button", { name: "Add referee" }) });
  const pickerId = await panel.getByRole("combobox").getAttribute("id");
  await pick(page, pickerId!, "Wanida", /Wanida/);
  await panel.getByRole("button", { name: "Add referee" }).click();
  await expect(page.getByText(/Already used as a referee for Legal 500/)).toBeVisible();
  await expect(page.getByText(/this year/)).toBeVisible();
  await panel.getByLabel("Add anyway").check();
  await panel.getByRole("button", { name: "Add referee" }).click();
  await expect(page.getByRole("link", { name: /Khun Wanida Charoenkul/ })).toBeVisible();

  // Referee history appears on the contact page
  await page.getByRole("link", { name: /Khun Wanida Charoenkul/ }).click();
  await expect(page.getByRole("heading", { name: "Directory referee" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Chambers & Partners/ })).toBeVisible();
});

test("confidential representative matter: hidden from non-members, cannot be publishable", async ({ page }) => {
  await loginOk(page, "partner2@example.com", DEMO_PASSWORD);
  await page.goto("/matters/new");
  await page.getByLabel("Matter title").fill("Restructuring of a listed hotel group");
  await page.getByLabel(/^Client description/).fill("a SET-listed hospitality group");
  await page.getByRole("checkbox", { name: /^Anonymised/ }).check();
  await page
    .getByRole("textbox", { name: /^Description/ })
    .fill("Advised on debt restructuring under the rehabilitation regime.");
  await page.getByLabel("Disputes/Litigation").check();
  await page.getByRole("checkbox", { name: /^Confidential/ }).check();
  await expect(page.getByRole("checkbox", { name: /^Publishable/ })).toBeDisabled();
  await page.getByRole("button", { name: "Create matter" }).click();
  await expect(page.getByRole("heading", { name: "Restructuring of a listed hotel group" })).toBeVisible();
  await expect(page.getByText("a SET-listed hospitality group · ")).toBeVisible();
  const url = page.url();
  await logout(page);

  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await page.goto("/matters");
  await expect(page.getByText("Restructuring of a listed hotel group")).toHaveCount(0);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("award entries can be added and updated", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/awards");
  await page.getByRole("textbox", { name: /^Award/ }).fill("Asialaw Awards");
  await page.getByRole("textbox", { name: /^Category/ }).fill("Thailand Disputes Firm of the Year");
  await page.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByRole("link", { name: "Asialaw Awards" })).toBeVisible();
  await page.getByRole("link", { name: "Asialaw Awards" }).click();
  await expect(page).toHaveURL(/\/awards\/c[a-z0-9]+$/);
  await page.getByLabel("Status").selectOption("SHORTLISTED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/awards$/);
  await expect(page.getByRole("row", { name: /Asialaw Awards/ }).getByText("Shortlisted")).toBeVisible();
});
