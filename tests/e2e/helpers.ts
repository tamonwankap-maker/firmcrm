import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@example.com", password: "ChangeMe!2026" };
export const DEMO_PASSWORD = "DemoPass2026!";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function loginOk(page: Page, email: string, password: string) {
  await login(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** The app's alert box (excludes Next.js's hidden route announcer, which also has role=alert). */
export const appAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}
