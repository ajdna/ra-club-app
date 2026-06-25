import { test, expect, type Page } from "@playwright/test";

// Feature tests for the recent changes: top-bar account menu (Profile / Help /
// Logout), the role-based 5th nav slot (coach -> Plan/followup), and the member
// Log page. Logged-in; skipped unless TEST_EMAIL / TEST_PASSWORD are set.

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe("top bar + nav features", () => {
  test.skip(!email || !password, "Set TEST_EMAIL and TEST_PASSWORD to run");

  test("top bar shows brand and account menu opens", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Ruby Nutrition Center").first()).toBeVisible();
    await page.getByRole("button", { name: /account menu/i }).click();
    await expect(page.getByRole("link", { name: /^profile$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^help$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^logout$/i })).toBeVisible();
  });

  test("account menu: Profile navigates to /profile", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("link", { name: /^profile$/i }).click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });
  });

  test("account menu: Help panel opens with contact message", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("button", { name: /^help$/i }).click();
    await expect(page.getByText(/help & support/i)).toBeVisible();
    await expect(page.getByText(/coach se sampark/i)).toBeVisible();
  });

  test("coach Plan tab opens follow-ups", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /^plan$/i }).click();
    await expect(page).toHaveURL(/\/followup/, { timeout: 10_000 });
  });

  test("log page loads with weight + attendance", async ({ page }) => {
    await login(page);
    await page.goto("/log");
    await expect(page).toHaveURL(/\/log/);
    await expect(page.locator('input[type="number"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /present today/i })).toBeVisible();
  });

  test("account menu: Logout returns to login", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("button", { name: /^logout$/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
