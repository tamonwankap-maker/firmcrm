import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, loginOk, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

async function pick(page: Page, inputId: string, text: string, option: string | RegExp) {
  await page.locator(`#${inputId}`).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

test("partner creates an opportunity, moves it through stages with conflict warning, pitches and wins it", async ({
  page,
}) => {
  await loginOk(page, "partner@example.com", DEMO_PASSWORD);
  await page.goto("/opportunities/new");
  await page.getByLabel("Opportunity name").fill("Hotel portfolio acquisition — โครงการโรงแรม");
  await pick(page, "organisationId", "Siam Example", /Siam Example Bank/);
  await page.getByLabel("Source").selectOption("REPEAT_CLIENT");
  await page.getByLabel("Real Estate").check();
  await page.getByLabel("Minimum fee").fill("2,000,000");
  await page.getByLabel("Maximum fee").fill("1000000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByText("Maximum must be at least the minimum")).toBeVisible();
  await page.getByLabel("Maximum fee").fill("3000000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("heading", { name: /Hotel portfolio acquisition/ })).toBeVisible();
  await expect(page.getByText("Somchai Wongsakul").first()).toBeVisible(); // partner defaults to lead

  // Conflict not cleared → warning that must be confirmed
  await page.getByLabel("Move to stage").selectOption("PROPOSAL_PREPARING");
  await page.getByRole("button", { name: "Update stage" }).click();
  await expect(page.getByText("The conflict check has not been cleared yet.")).toBeVisible();
  await page.getByLabel("Continue anyway").check();
  await page.getByRole("button", { name: "Update stage" }).click();
  await expect(page.locator("main").getByText("Proposal preparing").first()).toBeVisible();
  await expect(page.getByText(/Lead → Proposal preparing/)).toBeVisible();

  // Pitch with checklist
  await page.getByRole("link", { name: "New pitch" }).click();
  await page.getByRole("button", { name: "Create pitch" }).click();
  await expect(page.getByText("0 of 5 done")).toBeVisible();
  const saved = page.waitForResponse((r) => r.request().method() === "POST");
  await page.getByRole("checkbox", { name: "Team CVs" }).check();
  await saved;
  await expect(page.getByText("1 of 5 done")).toBeVisible();
  await page.getByRole("link", { name: /Hotel portfolio acquisition/ }).click();

  // Won requires a reason
  await page.getByLabel("Move to stage").selectOption("WON");
  await page.getByLabel("Why did we win?").selectOption("EXPERTISE");
  await page.getByRole("button", { name: "Update stage" }).click();
  await page.getByLabel("Continue anyway").check(); // conflict still not cleared
  await page.getByRole("button", { name: "Update stage" }).click();
  await expect(page.getByText("Won — Expertise")).toBeVisible();
});

test("board: move a card with the keyboard-friendly menu and record a loss", async ({ page }) => {
  await loginOk(page, "partner2@example.com", DEMO_PASSWORD);
  await page.goto("/opportunities?view=board");
  const lost = page.getByRole("region", { name: "Lost" });
  await page.getByLabel("Move Warehouse JV in EEC to another stage").selectOption("LOST");
  const dialog = page.getByRole("dialog", { name: "Change stage" });
  await expect(dialog.getByText("Lead → Lost")).toBeVisible();
  await dialog.getByRole("button", { name: "Update stage" }).click();
  await expect(dialog.getByLabel("Why did we lose?")).toHaveJSProperty("validity.valueMissing", true); // reason required
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Why did we lose?").selectOption("TIMING");
  await dialog.getByRole("button", { name: "Update stage" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(lost.getByText("Warehouse JV in EEC")).toBeVisible();
});

test("confidential deals: hidden from non-members, counted anonymously in the summary", async ({ page }) => {
  // BD (team member) sees it and gets its URL
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/opportunities?q=Sunrise");
  await page.getByRole("link", { name: /Project Sunrise/ }).click();
  await expect(page).toHaveURL(/\/opportunities\/c[a-z0-9]+$/);
  await expect(page.getByText("Confidential").first()).toBeVisible();
  const url = page.url();
  await logout(page);

  // Other partner: not in list, direct URL is "not found", summary shows only a count
  await loginOk(page, "partner2@example.com", DEMO_PASSWORD);
  await page.goto("/opportunities?status=all");
  await expect(page.getByText("Project Sunrise")).toHaveCount(0);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/opportunities/summary");
  await expect(page.getByText(/Totals include 1 confidential opportunity/)).toBeVisible();
  await expect(page.getByText("Project Sunrise")).toHaveCount(0);
  await page.goto("/search?q=Sunrise");
  await expect(page.getByText("Project Sunrise")).toHaveCount(0);
  await logout(page);

  // Viewer: no summary at all
  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await page.goto("/opportunities/summary");
  await expect(page).toHaveURL(/no-access/);
});
