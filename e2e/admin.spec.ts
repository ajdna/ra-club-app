import { test, expect, type Page } from "@playwright/test";

// Admin console tests — role-gated. These need a club_owner test account.
// Set ADMIN_EMAIL / ADMIN_PASSWORD in .env.test to enable.
// Without those, the whole group auto-skips.
// A coach/member TEST_EMAIL/TEST_PASSWORD pair is also needed for the
// "non-admin redirected" test.

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(adminEmail!);
  await page.locator('input[type="password"]').fill(adminPassword!);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function loginAsUser(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(testEmail!);
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe("admin console", () => {
  test.skip(!adminEmail || !adminPassword, "Set ADMIN_EMAIL and ADMIN_PASSWORD");

  test("admin console loads for owner", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /admin console/i }),
    ).toBeVisible();
  });

  test("admin → users management", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: /user management/i }),
    ).toBeVisible();
  });

  test("admin → roles page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/roles");
    await expect(
      page.getByRole("heading", { name: /role mappings/i }),
    ).toBeVisible();
  });

  test("admin → import page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/import");
    await expect(
      page.getByRole("heading", { name: /import members/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /download excel template/i }),
    ).toBeVisible();
  });

  test("admin → analytics", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/analytics");
    await expect(
      page.getByRole("heading", { name: /club analytics/i }),
    ).toBeVisible();
    // At least one stat tile should render
    await expect(page.getByText(/total members/i)).toBeVisible();
  });

  test("admin → push management", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/push");
    await expect(
      page.getByRole("heading", { name: /push notifications/i }),
    ).toBeVisible();
  });
});

test.describe("admin access control", () => {
  test.skip(
    !adminEmail || !adminPassword || !testEmail || !testPassword,
    "Set ADMIN_EMAIL + ADMIN_PASSWORD and TEST_EMAIL + TEST_PASSWORD",
  );

  test("non-admin is redirected from /admin", async ({ page }) => {
    await loginAsUser(page);
    await page.goto("/admin");
    // RLS or server logic should redirect non-owners away from admin
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 10_000 });
  });
});
