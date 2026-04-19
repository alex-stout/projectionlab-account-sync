import { test, expect } from "./fixtures";

test.beforeEach(async ({ page, popupBaseUrl }) => {
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

test("shows refresh buttons in panel header", async ({ page }) => {
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /↻ ProjectionLab/ }),
  ).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("clicking gear again returns to main view", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeVisible();
  await page.getByTitle("Settings").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeHidden();
  await expect(
    page.getByRole("button", { name: /↻ ProjectionLab/ }),
  ).toBeVisible();
});

test("clicking plugin button from settings returns to main view", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  await page.getByTitle("Vanguard").click();
  await expect(page.getByText("ProjectionLab API Key")).toBeHidden();
  await expect(
    page.getByRole("button", { name: /↻ ProjectionLab/ }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: /↻ ProjectionLab/ }).click();
  await expect(page.getByText(/no api key/i)).toBeVisible({ timeout: 10_000 });
});

test("amber dot on gear button when no API key is configured", async ({
  page,
}) => {
  const gearBtn = page.getByTitle("Settings");
  await expect(gearBtn.locator(".bg-amber-400")).toBeVisible();
});

test("Clear All Data removes the API key and all plugin data", async ({ page, context }) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");

  // Seed an API key and fake Vanguard accounts directly in storage
  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      plApiKey: "test-api-key",
      accounts_vanguard: [{ name: "Roth IRA", balance: 1200 }],
      mappings_vanguard: { "Roth IRA": "pl-roth-ira" },
    }),
  );

  // Reload popup so it picks up the seeded data
  await page.reload();
  await expect(page.getByText("Roth IRA")).toBeVisible();

  // Open settings and clear all data
  await page.getByTitle("Settings").click();
  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue("test-api-key");
  await page.getByRole("button", { name: "Clear All Data" }).click();
  await expect(page.getByRole("button", { name: "✓ Cleared" })).toBeVisible();

  // API key input is empty and amber dot is back
  await expect(page.getByPlaceholder(/paste your api key/i)).toHaveValue("");
  await expect(page.getByTitle("Settings").locator(".bg-amber-400")).toBeVisible();

  // Storage is actually empty for both key and plugin data
  const stored = await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.get([
      "plApiKey",
      "accounts_vanguard",
      "mappings_vanguard",
    ]),
  );
  expect(stored.plApiKey).toBeUndefined();
  expect(stored.accounts_vanguard).toBeUndefined();
  expect(stored.mappings_vanguard).toBeUndefined();

  // Plugin tab shows empty state
  await page.getByTitle("Settings").click(); // navigate back to plugin view
  await page.getByTitle("Vanguard").click();
  await expect(page.getByRole("button", { name: /↻ Vanguard/ })).toBeVisible();
});

test("saving an API key shows Saved feedback", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await page.getByPlaceholder(/paste your api key/i).fill("test-api-key");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /✓ Saved/ })).toBeVisible();
});

test("amber dot disappears after API key is saved", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await page.getByPlaceholder(/paste your api key/i).fill("test-api-key");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByTitle("Settings").locator(".bg-amber-400"),
  ).toBeHidden();
});
