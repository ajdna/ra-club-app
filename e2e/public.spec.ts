import { test, expect } from "@playwright/test";

// Public pages — no login needed. These render without a working backend, so they
// run anywhere (including CI) and prove the app boots and the entry screens work.

test("login page renders with the email + password form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/sehat, streak aur saath/i)).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /^log in$/i })).toBeVisible();
});

test("register page loads", async ({ page }) => {
  await page.goto("/auth/register");
  await expect(page.locator("input").first()).toBeVisible();
});

test("reset-password page loads", async ({ page }) => {
  await page.goto("/auth/reset-password");
  await expect(page).toHaveURL(/reset-password/);
  await expect(page.locator("input").first()).toBeVisible();
});
