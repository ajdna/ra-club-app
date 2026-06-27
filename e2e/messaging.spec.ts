import { test, expect, type Page } from "@playwright/test";

// Messaging composer, broadcast, group, and thread tests.
// Need TEST_EMAIL / TEST_PASSWORD in .env.test to run.

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe("messaging", () => {
  test.skip(!email || !password, "Set TEST_EMAIL and TEST_PASSWORD");

  test("new-message composer loads", async ({ page }) => {
    await login(page);
    await page.goto("/messages/new");
    await expect(
      page.getByRole("heading", { name: /new message/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/search by name or role/i),
    ).toBeVisible();
  });

  test("broadcast composer loads", async ({ page }) => {
    await login(page);
    await page.goto("/messages/broadcast");
    await expect(
      page.getByRole("heading", { name: /team broadcast/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /everyone/i }),
    ).toBeVisible();
  });

  test("group composer loads", async ({ page }) => {
    await login(page);
    await page.goto("/messages/group/new");
    await expect(page.getByText(/new group/i)).toBeVisible();
    await expect(
      page.getByPlaceholder(/e.g. morning batch/i),
    ).toBeVisible();
  });

  test("thread opens from inbox", async ({ page }) => {
    await login(page);
    await page.goto("/messages");
    // Click first thread if one exists
    const threadLink = page.locator('a[href^="/messages/"]').first();
    const hasThreads = await threadLink.isVisible().catch(() => false);
    if (hasThreads) {
      await threadLink.click();
      await expect(page).toHaveURL(/\/messages\/[\w-]+/, { timeout: 10_000 });
    }
  });

  test("thread back navigation returns to inbox", async ({ page }) => {
    await login(page);
    await page.goto("/messages");
    const threadLink = page.locator('a[href^="/messages/"]').first();
    const hasThreads = await threadLink.isVisible().catch(() => false);
    if (hasThreads) {
      await threadLink.click();
      await expect(page).toHaveURL(/\/messages\/[\w-]+/, { timeout: 10_000 });
      // Click back link
      const backLink = page.getByRole("link", { name: /messages/i }).first();
      await backLink.click();
      await expect(page).toHaveURL(/\/messages$/, { timeout: 10_000 });
    }
  });

  // FIX ME: this test would send a real message.
  // Needs an isolated test thread that gets cleaned up afterward.
  // Mark as fixme until a test-safe send + cleanup flow is designed.
  test.fixme("send message and see it in thread", async ({ page }) => {
    await login(page);
    await page.goto("/messages/new");
    // Click first contact
    const contact = page.getByRole("button").filter({ hasText: /\w+/ }).first();
    await contact.click();
    // Type and send
    await page.getByPlaceholder(/message/i).fill("E2E test message");
    await page.getByRole("button", { name: /send|bhejo/i }).click();
    // Verify message appears
    await expect(page.getByText("E2E test message")).toBeVisible();
  });
});
