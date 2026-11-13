import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, appAlert, login, loginOk } from "./helpers";

test("unauthenticated users are sent to the login page", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows an error; correct password signs in", async ({ page }) => {
  await login(page, ADMIN.email, "not-the-password");
  await expect(appAlert(page)).toContainText("Incorrect email or password");
  await loginOk(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
});

test("repeated failures lock the account temporarily", async ({ page }) => {
  // Lockout is per email, so use an address no other test signs in with.
  for (let i = 0; i < 5; i++) await login(page, "lockout-test@example.com", `wrong-${i}`);
  await login(page, "lockout-test@example.com", DEMO_PASSWORD);
  await expect(appAlert(page)).toContainText("Too many failed attempts");
});

test("viewer cannot reach admin pages and does not see the admin menu", async ({ page }) => {
  await loginOk(page, "viewer@example.com", DEMO_PASSWORD);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Users" })).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/no-access$/);
  await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
});

test("admin creates a user, who must change the temporary password at first sign-in", async ({ page, browser }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/users/new");
  await page.getByLabel("Full name").fill("วิภาวดี ใจดี (Wipawadee Jaidee)");
  await page.getByLabel("Email").fill("wipawadee@example.com");
  await page.getByLabel("Title").fill("BD Coordinator");
  await page.getByLabel("Role").selectOption("BD");
  await page.getByLabel("Tax").check();
  await page.getByRole("button", { name: "Create user" }).click();
  const temp = (await page.locator("code").textContent())!.trim();
  expect(temp).toMatch(/^\w{4}-\w{4}-\w{4}$/);

  // Thai name stored and shown correctly
  await page.goto("/admin/users");
  await expect(page.getByText("วิภาวดี ใจดี (Wipawadee Jaidee)")).toBeVisible();

  // New user signs in with the temporary password → forced to change it
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, "wipawadee@example.com", temp);
  await expect(p2).toHaveURL(/\/account\/password$/);
  await p2.goto("/admin/lists"); // any page → still forced to change password
  await expect(p2).toHaveURL(/\/account\/password$/);
  await p2.getByLabel(/^Current password/).fill(temp);
  await p2.getByLabel(/^New password/).fill("short");
  await p2.getByLabel("Confirm new password").fill("short");
  await p2.getByRole("button", { name: "Change password" }).click();
  await expect(p2.getByText("at least 12 characters")).toBeVisible();
  await p2.getByLabel(/^Current password/).fill(temp);
  await p2.getByLabel(/^New password/).fill("NewSecurePass2026");
  await p2.getByLabel("Confirm new password").fill("NewSecurePass2026");
  await p2.getByRole("button", { name: "Change password" }).click();
  await expect(p2).toHaveURL(/\/login\?changed=1/);
  await loginOk(p2, "wipawadee@example.com", "NewSecurePass2026");
  await ctx.close();
});

test("changing a user's role signs them out immediately", async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const bd = await ctx.newPage();
  await loginOk(bd, "bd2@example.com", DEMO_PASSWORD);

  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/users");
  await page.getByRole("link", { name: "Tanawat Boonmee" }).click();
  await page.getByLabel("Role").selectOption("VIEWER");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("User saved.")).toBeVisible();

  await bd.goto("/dashboard");
  await expect(bd).toHaveURL(/\/login/);
  await ctx.close();
});

test("admin cannot remove their own admin access", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/users");
  await page.getByRole("link", { name: "Head of BD" }).click();
  await page.getByLabel("Role").selectOption("BD");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(appAlert(page)).toContainText("cannot remove your own admin access");
});

test("lists, settings and the audit log work", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);

  await page.goto("/admin/lists");
  await page.getByLabel("New practice area").fill("Restructuring & Insolvency");
  await page.getByRole("button", { name: "Add" }).first().click();
  await expect(page.getByText("Restructuring & Insolvency")).toBeVisible();

  await page.goto("/admin/settings");
  await page.getByLabel("USD → THB exchange rate").fill("36.25");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.goto("/admin/audit?entity=Setting");
  await expect(page.getByRole("cell", { name: "Setting" }).first()).toBeVisible();
  await page.goto("/admin/audit?action=LOGIN_FAILED");
  await expect(page.getByRole("cell").getByText("LOGIN_FAILED").first()).toBeVisible();
});
