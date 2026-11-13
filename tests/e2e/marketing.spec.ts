import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, appAlert, loginOk } from "./helpers";

test.describe.configure({ mode: "serial" });

test("event: create, invite with PDPA warning, record RSVP, attendance and follow-up", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/events/new");
  await page.getByRole("textbox", { name: /^Title/ }).fill("Tax update seminar — สัมมนาภาษี");
  await page.getByLabel(/^Starts/).fill("2026-12-10T14:00");
  await page.getByRole("textbox", { name: /^Venue/ }).fill("Firm auditorium");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByRole("heading", { name: "Tax update seminar — สัมมนาภาษี" })).toBeVisible();
  await expect(page.getByText("10 Dec 2026, 14:00")).toBeVisible();

  // Invite everyone at Siam Example Bank: Wanida has no event-invite consent → warning
  await page.locator('[id^="inv-org-"]').fill("Siam Example");
  await page
    .getByRole("option", { name: /Siam Example Bank/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to invite list" }).click();
  await expect(appAlert(page).filter({ hasText: "no event-invitation consent (PDPA)" })).toBeVisible();
  await page.getByLabel("Add them anyway").check();
  await page.getByRole("button", { name: "Add to invite list" }).click();
  const row = page.getByRole("row", { name: /Wanida/ });
  await expect(row).toBeVisible();
  await expect(row.getByLabel("No event-invitation consent")).toBeVisible();

  // RSVP yes → also marked invited
  const saved = () => page.waitForResponse((r) => r.request().method() === "POST");
  let s = saved();
  await row.getByLabel(/RSVP/).selectOption("YES");
  await s;
  await expect(row.getByLabel(/invited/)).toBeChecked();
  s = saved();
  await row.getByLabel(/attended/).selectOption("yes");
  await s;
  await page.reload();
  await expect(page.getByText("Follow-ups open").locator("..").getByText("1")).toBeVisible();
  await expect(page.getByText("1 attendee(s) have no follow-up owner yet.")).toBeVisible();
});

test("content: add an item and publish it", async ({ page }) => {
  await loginOk(page, "partner@example.com", DEMO_PASSWORD);
  await page.goto("/content");
  await page.getByRole("textbox", { name: /^Title/ }).fill("Thai Revenue Code amendments — client alert");
  await page.locator("#type").selectOption("CLIENT_ALERT");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("link", { name: "Thai Revenue Code amendments — client alert" })).toBeVisible();
  await page.getByRole("link", { name: "Thai Revenue Code amendments — client alert" }).click();
  await expect(page).toHaveURL(/\/content\/c[a-z0-9]+$/);
  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter the publication date")).toBeVisible();
  await page.getByLabel("Publish date").fill("2026-11-12");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/content$/);
  await expect(page.getByRole("row", { name: /Thai Revenue Code/ }).getByText("Published")).toBeVisible();
});

test("client plan: one per client per year; cross-sell gaps shown", async ({ page }) => {
  await loginOk(page, "bd@example.com", DEMO_PASSWORD);
  await page.goto("/client-plans/new");
  await page.locator("#organisationId").fill("Siam Example");
  await page
    .getByRole("option", { name: /Siam Example Bank/ })
    .first()
    .click();
  await page.getByLabel("Objectives").fill("Duplicate plan");
  await page.getByRole("button", { name: "Create plan" }).click();
  await expect(appAlert(page).first()).toContainText(/already a \d{4} plan/);

  await page.goto("/client-plans");
  await page.getByRole("link", { name: /Siam Example Bank/ }).click();
  await expect(page.getByText("Gap — no work yet")).toBeVisible();
  await expect(page.getByText("Already instructed")).toBeVisible();
});
