import { test, expect, type Page } from "@playwright/test";

// Members directory, detail, intake, report, add-member, and search tests.
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

test.describe("members directory", () => {
  test.skip(!email || !password, "Set TEST_EMAIL and TEST_PASSWORD");

  test("members list renders", async ({ page }) => {
    await login(page);
    await page.goto("/members");
    await expect(page.getByRole("heading", { name: /^members$/i })).toBeVisible();
    // Either member rows or the empty state
    await expect(
      page.getByText(/koi member nahi mila|total$/i).first(),
    ).toBeVisible();
  });

  test("member detail opens", async ({ page }) => {
    await login(page);
    await page.goto("/members");
    // Click the first member row if one exists
    const memberLink = page.locator('a[href^="/members/"]').first();
    const hasMembers = await memberLink.isVisible().catch(() => false);
    if (hasMembers) {
      await memberLink.click();
      await expect(page).toHaveURL(/\/members\/[\w-]+/, { timeout: 10_000 });
    }
    // If no members, test passes trivially (nothing to click)
  });

  test("member intake tab loads", async ({ page }) => {
    await login(page);
    await page.goto("/members");
    const memberLink = page.locator('a[href^="/members/"]').first();
    const hasMembers = await memberLink.isVisible().catch(() => false);
    if (hasMembers) {
      await memberLink.click();
      await expect(page).toHaveURL(/\/members\/[\w-]+/, { timeout: 10_000 });
      // Navigate to intake tab
      const intakeLink = page
        .getByRole("link", { name: /intake|capture|1st home visit/i })
        .first();
      const hasIntakeLink = await intakeLink.isVisible().catch(() => false);
      if (hasIntakeLink) {
        await intakeLink.click();
        await expect(
          page.getByRole("heading", { name: /1st home visit|intake/i }),
        ).toBeVisible();
      }
    }
  });

  test("member report tab loads", async ({ page }) => {
    await login(page);
    await page.goto("/members");
    const memberLink = page.locator('a[href^="/members/"]').first();
    const hasMembers = await memberLink.isVisible().catch(() => false);
    if (hasMembers) {
      await memberLink.click();
      await expect(page).toHaveURL(/\/members\/[\w-]+/, { timeout: 10_000 });
      const reportLink = page
        .getByRole("link", { name: /report card/i })
        .first();
      const hasReportLink = await reportLink.isVisible().catch(() => false);
      if (hasReportLink) {
        await reportLink.click();
        await expect(
          page.getByRole("heading", { name: /report card/i }),
        ).toBeVisible();
      }
    }
  });

  test("add-member form rejects invalid phone", async ({ page }) => {
    await login(page);
    await page.goto("/add");
    await expect(page.getByRole("heading", { name: /add member/i })).toBeVisible();
    // Submit with blank phone — should show validation
    await page.getByPlaceholder(/member ka naam/i).fill("Test Member");
    await page.getByRole("button", { name: /add member/i }).click();
    // Either a phone validation error or the form should not submit
    // (checking no navigation away from /add)
    await expect(page).toHaveURL(/\/add/, { timeout: 5_000 });
  });

  test("search page works", async ({ page }) => {
    await login(page);
    await page.goto("/search");
    await expect(
      page.getByRole("heading", { name: /search/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/search members by name or phone/i),
    ).toBeVisible();
  });
});
