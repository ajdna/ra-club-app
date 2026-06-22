import { test, expect } from "@playwright/test";

// Logged-in flows. These need a TEST account so they never touch real club data.
// Set TEST_EMAIL and TEST_PASSWORD (see .env.test.example) to switch them on;
// without those, the whole group is skipped automatically.

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe("authenticated flows", () => {
  test.skip(!email || !password, "Set TEST_EMAIL and TEST_PASSWORD to run login tests");

  test("a logged-out visitor is redirected to the login page", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/login/);
  });

  test("user can log in and leave the login screen", async ({ page }) => {
    await login(page);
  });

  test("members page loads after login", async ({ page }) => {
    await login(page);
    await page.goto("/members");
    await expect(page).toHaveURL(/\/members/);
  });

  test("messages page loads after login", async ({ page }) => {
    await login(page);
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/messages/);
  });
});
