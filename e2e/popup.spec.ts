import { test, expect } from "./fixtures";
import {
  clearStorage,
  getServiceWorker,
  getStorage,
  seedStorage,
} from "./helpers";

test.beforeEach(async ({ page, popupBaseUrl, context }) => {
  const sw = await getServiceWorker(context);
  await clearStorage(sw);
  await page.goto(`${popupBaseUrl}/popup.html`);
});

test("shows sidebar with plugin buttons", async ({ page }) => {
  await expect(page.getByText("PL")).toBeVisible();
  await expect(page.getByTitle("Vanguard")).toBeVisible();
  await expect(page.getByTitle("Alight")).toBeVisible();
});

test("shows active plugin name in header", async ({ page }) => {
  await expect(
    page
      .getByRole("heading", { name: /Vanguard/ })
      .or(
        page.locator(".font-semibold").filter({ hasText: "Vanguard" }).first(),
      ),
  ).toBeVisible();
});

test("switches active plugin when sidebar button clicked", async ({ page }) => {
  await page.getByTitle("Alight").click();
  await expect(
    page.locator(".font-semibold", { hasText: "Alight" }).first(),
  ).toBeVisible();
});

test("shows empty state with refresh prompt for Vanguard", async ({ page }) => {
  await expect(page.getByText(/Open Vanguard/)).toBeVisible();
});

test("shows source refresh button in panel header", async ({ page }) => {
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();
});

test("shows error when refreshing source with no tab open", async ({
  page,
}) => {
  await page.getByRole("button", { name: /↻ Vanguard/ }).click();
  // Wait for loading to appear, then disappear (service worker may need to wake up)
  await expect(page.getByText("Loading…")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Loading…")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText(/not open/i)).toBeVisible();
});

test("shows gear Settings button in sidebar", async ({ page }) => {
  await expect(page.getByTitle("Settings")).toBeVisible();
});

test("clicking gear opens settings panel with API key input", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeVisible();
  await expect(page.getByPlaceholder(/paste your api key/i)).toBeVisible();
});

test("settings panel has disabled Save button when input is empty", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  // PL Save = [0], YNAB Save = [1]. Both disabled initially.
  await expect(
    page.getByRole("button", { name: /^Save$/ }).first(),
  ).toBeDisabled();
});

test("clicking gear again returns to main view", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeVisible();
  await page.getByTitle("Settings").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeHidden();
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();
});

test("clicking plugin button from settings returns to main view", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  await page.getByTitle("Vanguard").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeHidden();
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();
});

test("settings panel shows Clear All Data button", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await expect(
    page.getByRole("button", { name: "Clear All Data" }),
  ).toBeVisible();
});

test("Clear All Data shows confirmation feedback", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await page.getByRole("button", { name: "Clear All Data" }).click();
  await expect(page.getByRole("button", { name: "✓ Cleared" })).toBeVisible();
});

test("shows error when refreshing PL accounts with no API key set", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  await page.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(page.getByText(/no api key/i)).toBeVisible({ timeout: 10_000 });
});

test("amber dot on gear button when no API key is configured", async ({
  page,
}) => {
  const gearBtn = page.getByTitle("Settings");
  await expect(gearBtn.locator(".bg-amber-400")).toBeVisible();
});

test("Clear All Data removes the API key and all plugin data", async ({ page, context }) => {
  const sw = await getServiceWorker(context);

  // Seed PL key, Vanguard accounts, AND YNAB creds so we can prove they all get removed.
  await seedStorage(sw, {
    plApiKey: "test-api-key",
    accounts_vanguard: [{ name: "Roth IRA", balance: 1200 }],
    mappings_vanguard: { "Roth IRA": "pl-roth-ira" },
    creds_ynab: { accessToken: "ynab-tok" },
  });

  // Reload popup so it picks up the seeded data
  await page.reload();
  await expect(page.getByText("Roth IRA")).toBeVisible();

  // Open settings and clear all data
  await page.getByTitle("Settings").click();
  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue("test-api-key");
  // The second password input is the YNAB token — verify it's pre-filled before clearing.
  const ynabToken = page.locator('input[type="password"]').nth(1);
  await expect(ynabToken).toHaveValue("ynab-tok");

  await page.getByRole("button", { name: "Clear All Data" }).click();
  await expect(page.getByRole("button", { name: "✓ Cleared" })).toBeVisible();

  // Both inputs are empty and amber dot is back
  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue("");
  await expect(page.locator('input[type="password"]').nth(1)).toHaveValue("");
  await expect(page.getByTitle("Settings").locator(".bg-amber-400")).toBeVisible();

  // Storage is actually empty for keys, plugin data, AND YNAB creds
  const stored = await getStorage(sw, [
    "plApiKey",
    "accounts_vanguard",
    "mappings_vanguard",
    "creds_ynab",
  ]);
  expect(stored.plApiKey).toBeUndefined();
  expect(stored.accounts_vanguard).toBeUndefined();
  expect(stored.mappings_vanguard).toBeUndefined();
  expect(stored.creds_ynab).toBeUndefined();

  // Plugin tab shows empty state
  await page.getByTitle("Settings").click(); // navigate back to plugin view
  await page.getByTitle("Vanguard").click();
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();

  // YNAB availability dot should be off because creds were cleared
  await expect(page.getByTitle("YNAB").locator(".bg-green-400")).toBeHidden();
});

test("saving an API key shows Saved feedback", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await page.getByPlaceholder(/paste your api key/i).fill("test-api-key");
  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await expect(page.getByRole("button", { name: /✓ Saved/ })).toBeVisible();
});

test("amber dot disappears after API key is saved", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await page.getByPlaceholder(/paste your api key/i).fill("test-api-key");
  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await expect(
    page.getByTitle("Settings").locator(".bg-amber-400"),
  ).toBeHidden();
});

test("PL key Clear button removes the key but preserves plugin data", async ({
  page,
  context,
}) => {
  const sw = await getServiceWorker(context);

  const seededAccounts = [
    { name: "Roth IRA", balance: 1200, rateOfReturn: null, accountId: null },
  ];
  await seedStorage(sw, {
    plApiKey: "test-api-key",
    accounts_vanguard: seededAccounts,
    mappings_vanguard: { "Roth IRA": "pl-roth-ira" },
  });

  await page.reload();
  await page.getByTitle("Settings").click();
  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue(
    "test-api-key",
  );

  await page.getByRole("button", { name: "Clear", exact: true }).click();

  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue("");
  await expect(
    page.getByTitle("Settings").locator(".bg-amber-400"),
  ).toBeVisible();

  const stored = await getStorage(sw, [
    "plApiKey",
    "accounts_vanguard",
    "mappings_vanguard",
  ]);
  expect(stored.plApiKey).toBeUndefined();
  expect(stored.accounts_vanguard).toEqual(seededAccounts);
  expect(stored.mappings_vanguard).toEqual({ "Roth IRA": "pl-roth-ira" });
});
