import { test, expect } from "./fixtures";
import {
  clearStorage,
  getServiceWorker,
  getStorage,
  openMockTab,
  openPopup,
  seedStorage,
} from "./helpers";

const VANGUARD_URL = "http://localhost:3000/vanguard/";
const ALIGHT_URL = "http://localhost:3000/alight/";
const PL_URL = "http://localhost:3000/projectionlab/";

test.beforeEach(async ({ context }) => {
  const sw = await getServiceWorker(context);
  await clearStorage(sw);
  await seedStorage(sw, { plApiKey: "test-key" });
});

test("refreshes Vanguard accounts from mock tab", async ({ context, popupBaseUrl }) => {
  await openMockTab(context, VANGUARD_URL);

  const popup = await openPopup(context, popupBaseUrl);
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();

  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("Traditional 401k")).toBeVisible();
  await expect(popup.getByText("$1,200")).toBeVisible();
  await expect(popup.getByText("$1,850")).toBeVisible();
});

test("loads ProjectionLab accounts into dropdowns from mock tab", async ({ context, popupBaseUrl }) => {
  // Vanguard must be refreshed first so account rows (and their selects) exist
  await openMockTab(context, VANGUARD_URL);

  const popup = await openPopup(context, popupBaseUrl);
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  // Now open PL tab and load accounts from Settings
  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Vanguard").click();

  const firstSelect = popup.locator("select").first();
  await expect(firstSelect).toBeEnabled({ timeout: 10_000 });
  await expect(firstSelect.locator("option", { hasText: "Roth IRA" })).toBeAttached();
  await expect(firstSelect.locator("option", { hasText: "Traditional 401k" })).toBeAttached();
});

test("full sync: Vanguard → ProjectionLab", async ({ context, popupBaseUrl }) => {
  await openMockTab(context, VANGUARD_URL);

  const popup = await openPopup(context, popupBaseUrl);

  // Step 1: pull Vanguard accounts (before opening PL tab to avoid race)
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("Traditional 401k")).toBeVisible();

  // Step 2: open PL tab then pull PL accounts from Settings
  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Vanguard").click();
  const selects = popup.locator("select");
  await expect(selects.first()).toBeEnabled({ timeout: 10_000 });

  // Step 3: map both accounts
  await selects.nth(0).selectOption("pl-roth-ira");
  await selects.nth(1).selectOption("pl-401k");

  // Step 4: sync
  await popup.getByRole("button", { name: "Sync to ProjectionLab" }).click();

  // Step 5: verify results
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText(/✓.*Traditional 401k/)).toBeVisible();
});

test("refreshes Alight accounts from mock tab", async ({ context, popupBaseUrl }) => {
  await openMockTab(context, ALIGHT_URL);

  const popup = await openPopup(context, popupBaseUrl);
  await popup.getByRole("button", { name: "Alight" }).click();
  await popup.getByRole("button", { name: /↻ Alight/ }).click();

  await expect(popup.getByText("401(k) \u2014 Core")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("HSA \u2014 Health Savings")).toBeVisible();
  await expect(popup.getByText("$1,650")).toBeVisible();
  await expect(popup.getByText("$1,050")).toBeVisible();
});

test("full sync: Alight → ProjectionLab", async ({ context, popupBaseUrl }) => {
  await openMockTab(context, ALIGHT_URL);

  const popup = await openPopup(context, popupBaseUrl);
  await popup.getByRole("button", { name: "Alight" }).click();

  // Step 1: pull Alight accounts
  await popup.getByRole("button", { name: /↻ Alight/ }).click();
  await expect(popup.getByText("401(k) \u2014 Core")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("HSA \u2014 Health Savings")).toBeVisible();

  // Step 2: open PL tab then pull PL accounts from Settings
  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Alight").click();
  const selects = popup.locator("select");
  await expect(selects.first()).toBeEnabled({ timeout: 10_000 });

  // Step 3: map both accounts
  await selects.nth(0).selectOption("pl-roth-ira");
  await selects.nth(1).selectOption("pl-401k");

  // Step 4: sync
  await popup.getByRole("button", { name: "Sync to ProjectionLab" }).click();

  // Step 5: verify results
  await expect(popup.getByText(/✓.*401\(k\)/)).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText(/✓.*HSA/)).toBeVisible();
});

test("Vanguard shows availability dot when its tab is open", async ({
  context,
  popupBaseUrl,
}) => {
  await openMockTab(context, VANGUARD_URL);
  const popup = await openPopup(context, popupBaseUrl);

  // Vanguard is the default active plugin → indigo-200 dot
  await expect(
    popup.getByTitle("Vanguard").locator(".bg-indigo-200"),
  ).toBeVisible();

  // Switch to Alight, Vanguard becomes inactive → green-400 dot
  await popup.getByTitle("Alight").click();
  await expect(
    popup.getByTitle("Vanguard").locator(".bg-green-400"),
  ).toBeVisible();
});

test("sidebar shows 'just now' timestamp after a successful sync", async ({
  context,
  popupBaseUrl,
}) => {
  await openMockTab(context, VANGUARD_URL);
  const popup = await openPopup(context, popupBaseUrl);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Vanguard").click();
  const selects = popup.locator("select");
  await expect(selects.first()).toBeEnabled({ timeout: 10_000 });
  await selects.nth(0).selectOption("pl-roth-ira");

  await popup.getByRole("button", { name: "Sync to ProjectionLab" }).click();
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });

  await expect(
    popup.getByTitle("Vanguard").getByText("just now"),
  ).toBeVisible();
});

test("mappings persist across popup reopen", async ({
  context,
  popupBaseUrl,
}) => {
  await openMockTab(context, VANGUARD_URL);
  let popup = await openPopup(context, popupBaseUrl);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Vanguard").click();
  await expect(popup.locator("select").first()).toBeEnabled({
    timeout: 10_000,
  });
  await popup.locator("select").nth(0).selectOption("pl-roth-ira");

  // Close popup and reopen — mappings/accounts should rehydrate from storage
  await popup.close();
  popup = await openPopup(context, popupBaseUrl);

  await expect(popup.locator("select").first()).toHaveValue("pl-roth-ira", {
    timeout: 10_000,
  });
});

test("switching plugins preserves previously refreshed source data", async ({
  context,
  popupBaseUrl,
}) => {
  await openMockTab(context, VANGUARD_URL);
  const popup = await openPopup(context, popupBaseUrl);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await popup.getByTitle("Alight").click();
  await expect(popup.getByText("Roth IRA")).toBeHidden();

  await popup.getByTitle("Vanguard").click();
  await expect(popup.getByText("Roth IRA")).toBeVisible();
});

test("re-syncing after a successful sync still succeeds", async ({
  context,
  popupBaseUrl,
}) => {
  await openMockTab(context, VANGUARD_URL);
  const popup = await openPopup(context, popupBaseUrl);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await openMockTab(context, PL_URL);
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
  await popup.getByTitle("Vanguard").click();
  await expect(popup.locator("select").first()).toBeEnabled({
    timeout: 10_000,
  });
  await popup.locator("select").nth(0).selectOption("pl-roth-ira");

  const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
  await syncBtn.click();
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });

  // Capture lastSynced, trigger second sync, verify timestamp advanced
  const sw = await getServiceWorker(context);
  const first = (await getStorage(sw, "lastSynced_vanguard")) as {
    lastSynced_vanguard: number;
  };

  await syncBtn.click();
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });

  await expect
    .poll(
      async () =>
        ((await getStorage(sw, "lastSynced_vanguard")) as {
          lastSynced_vanguard: number;
        }).lastSynced_vanguard,
      { timeout: 5_000 },
    )
    .toBeGreaterThan(first.lastSynced_vanguard);
});

test("PL accounts loaded in Settings populate dropdowns for every plugin", async ({
  context,
  popupBaseUrl,
}) => {
  // Seed Vanguard + Alight accounts directly so both plugins render dropdowns.
  const sw = await getServiceWorker(context);
  await seedStorage(sw, {
    accounts_vanguard: [
      { name: "Roth IRA", balance: 1200, rateOfReturn: null, accountId: null },
    ],
    accounts_alight: [
      { name: "401(k) — Core", balance: 1650, rateOfReturn: null, accountId: null },
    ],
  });

  await openMockTab(context, PL_URL);
  const popup = await openPopup(context, popupBaseUrl);

  // Load PL accounts once from Settings.
  await popup.getByTitle("Settings").click();
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });

  // Vanguard dropdown has PL options.
  await popup.getByTitle("Vanguard").click();
  const vanguardSelect = popup.locator("select").first();
  await expect(vanguardSelect).toBeEnabled({ timeout: 10_000 });
  await expect(
    vanguardSelect.locator("option", { hasText: "Roth IRA" }),
  ).toBeAttached();

  // Alight dropdown has the same PL options — no second refresh needed.
  await popup.getByTitle("Alight").click();
  const alightSelect = popup.locator("select").first();
  await expect(alightSelect).toBeEnabled({ timeout: 10_000 });
  await expect(
    alightSelect.locator("option", { hasText: "Roth IRA" }),
  ).toBeAttached();
  await expect(
    alightSelect.locator("option", { hasText: "Traditional 401k" }),
  ).toBeAttached();
});

test("Settings shows 'Not loaded' → 'N loaded · just now' after refresh", async ({
  context,
  popupBaseUrl,
}) => {
  const popup = await openPopup(context, popupBaseUrl);
  await popup.getByTitle("Settings").click();
  await expect(popup.getByText("Not loaded")).toBeVisible();

  await openMockTab(context, PL_URL);
  await popup.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(popup.getByText(/\d+ loaded · just now/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(popup.getByText("Not loaded")).toBeHidden();
});
