import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 4,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],
  use: {
    trace: "on-first-retry",
    screenshot: isCI ? "only-on-failure" : "on",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command: "npx vite --config e2e/mock-sites/vite.config.ts --port 3000",
    port: 3000,
    reuseExistingServer: !isCI,
  },
});
