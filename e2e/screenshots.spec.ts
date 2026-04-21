import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";
import { clearStorage, getServiceWorker, seedStorage } from "./helpers";

/**
 * Helper script for generating screenshots
 */
const mins = (n: number) => Date.now() - n * 60 * 1000;

const DEMO_STATE = {
  plApiKey: "demo-key",
  plAccounts: [
    { id: "pl-1", name: "Roth IRA" },
    { id: "pl-2", name: "Taxable Brokerage" },
    { id: "pl-3", name: "401(k) Rollover" },
    { id: "pl-4", name: "HSA" },
    { id: "pl-5", name: "Checking" },
  ],
  plLastRefreshed: mins(3),
  accounts_vanguard: [
    { name: "Roth IRA — VTSAX", balance: 48250.12, accountId: "v-1" },
    { name: "Taxable — VTI", balance: 112800.44, accountId: "v-2" },
    { name: "Rollover IRA", balance: 217400.08, accountId: "v-3" },
  ],
  mappings_vanguard: { "v-1": "pl-1", "v-2": "pl-2", "v-3": "pl-3" },
  lastRefreshed_vanguard: mins(4),
  lastSynced_vanguard: mins(4),
  creds_ynab: { accessToken: "demo-token-placeholder" },
};

async function launchDemoContext(): Promise<BrowserContext> {
  const extPath = path.resolve(".output/chrome-mv3");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    deviceScaleFactor: 2,
    viewport: { width: 460, height: 480 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
    ],
  });
  const sw = await getServiceWorker(context);
  await clearStorage(sw);
  await seedStorage(sw, DEMO_STATE);
  return context;
}

test.describe("Screenshots", () => {
  test.skip(
    !process.env.SCREENSHOTS,
    "Set SCREENSHOTS=true or run `npm run screenshots`",
  );

  test("popup", async () => {
    const context = await launchDemoContext();
    try {
      const sw = await getServiceWorker(context);
      const extensionId = sw.url().split("/")[2];
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(page.getByText("Roth IRA — VTSAX")).toBeVisible();
      await page.screenshot({ path: "docs/popup.png" });
    } finally {
      await context.close();
    }
  });

  test("settings", async () => {
    const context = await launchDemoContext();
    try {
      const sw = await getServiceWorker(context);
      const extensionId = sw.url().split("/")[2];
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.getByTitle("Settings").click();
      await expect(page.getByText("ProjectionLab API Key")).toBeVisible();
      // Unfix body height so the full scrollable settings panel fits in one shot.
      await page.addStyleTag({
        content: "body, #root { height: auto !important; min-height: 480px; }",
      });
      await page.screenshot({ path: "docs/settings.png", fullPage: true });
    } finally {
      await context.close();
    }
  });
});
