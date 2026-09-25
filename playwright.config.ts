import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.pw.ts",
  testIgnore: process.env.PERF ? [] : ["**/performance.pw.ts"],
  fullyParallel: true,
  workers: 4,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://127.0.0.1:4188",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run tests/browser/harness.tsx",
    url: "http://127.0.0.1:4188",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
