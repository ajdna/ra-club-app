import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "fs";

// Load .env.test (TEST_EMAIL / TEST_PASSWORD / BASE_URL) if present — no dependency.
if (existsSync(".env.test")) {
  for (const line of readFileSync(".env.test", "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

// Where the tests point. Defaults to a locally-started app; set BASE_URL to test
// a deployed site instead, e.g. BASE_URL=https://your-app.vercel.app npm run test:e2e
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // The local dev server compiles each route on first hit. Running one worker
  // avoids overwhelming it with parallel cold compiles (which caused ECONNRESET).
  // CI builds first and serves a production build, so it can run in parallel.
  workers: !process.env.CI && !process.env.BASE_URL ? 1 : undefined,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // When no external BASE_URL is given, start the app automatically:
  //   - locally: `npm run dev`
  //   - in CI:   `npm run start` (the CI job builds first)
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npx next dev --webpack",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
