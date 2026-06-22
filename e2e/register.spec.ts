import { test, expect } from "@playwright/test";

// Register-page validation. These submit INVALID data only, so client validation
// blocks before supabase.auth.signUp() — no real users created, no emails sent.
// Safe to run repeatedly (incl. CI). Full happy-path signup is intentionally NOT
// automated (it creates real auth users + hits email rate limits + needs approval).

test.describe("register validation", () => {
  test("page loads with the new fields", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByPlaceholder("Aapka naam")).toBeVisible();
    await expect(page.getByText(/user id \(optional\)/i)).toBeVisible();
    await expect(page.getByText("Phone *", { exact: true })).toBeVisible();
    await expect(page.getByText(/yeh number whatsapp pe hai/i)).toBeVisible();
  });

  test("rejects an invalid email", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByPlaceholder("Aapka naam").fill("Test User");
    await page.getByPlaceholder("you@example.com").fill("not-an-email");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /register karo/i }).click();
    await expect(page.getByText(/valid email daalein/i)).toBeVisible();
  });

  test("rejects an invalid phone", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByPlaceholder("Aapka naam").fill("Test User");
    await page.getByPlaceholder("you@example.com").fill("valid@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByPlaceholder("+9198xxxxxxxx").fill("123");
    await page.getByRole("button", { name: /register karo/i }).click();
    await expect(page.getByText(/valid phone number/i)).toBeVisible();
  });

  test("WhatsApp field appears when number differs", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/yeh number whatsapp pe hai/i).uncheck();
    await expect(page.getByText("WhatsApp number *", { exact: true })).toBeVisible();
  });
});
