import { defineConfig } from "@playwright/test";

const isCi = !!process.env.CI;

export default defineConfig({
	testDir: "e2e",
	forbidOnly: isCi,
	retries: isCi ? 2 : 0,
	workers: isCi ? 1 : 4,
	reporter: isCi
		? [["github"], ["html", { open: "never" }]]
		: [["html", { open: "on-failure" }]],
	use: {
		trace: "on-first-retry",
		screenshot: isCi ? "only-on-failure" : "on",
		video: "retain-on-failure",
	},
	projects: [{ name: "chromium" }],
	webServer: {
		command: "npx vite --config e2e/mock-sites/vite.config.ts --port 3000",
		port: 3000,
		reuseExistingServer: !isCi,
	},
});
