import { test, expect } from "./fixtures";

const VANGUARD_URL = "http://localhost:3000/vanguard/";
const ALIGHT_URL = "http://localhost:3000/alight/";
const PL_URL = "http://localhost:3000/projectionlab/";

test.beforeEach(async ({ context }) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");
  await sw.evaluate(() => (globalThis as any).chrome.storage.local.clear());
  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({ plApiKey: "test-key" }),
  );
});

test("refreshes Vanguard accounts from mock tab", async ({ context, popupBaseUrl }) => {
  const vanguardPage = await context.newPage();
  await vanguardPage.goto(VANGUARD_URL);

  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();

  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("Traditional 401k")).toBeVisible();
  await expect(popup.getByText("$1,200")).toBeVisible();
  await expect(popup.getByText("$1,850")).toBeVisible();
});

test("loads ProjectionLab accounts into dropdowns from mock tab", async ({ context, popupBaseUrl }) => {
  // Vanguard must be refreshed first so account rows (and their selects) exist
  const vanguardPage = await context.newPage();
  await vanguardPage.goto(VANGUARD_URL);

  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  // Now open PL tab and load accounts
  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();

  const firstSelect = popup.locator("select").first();
  await expect(firstSelect).toBeEnabled({ timeout: 10_000 });
  await expect(firstSelect.locator("option", { hasText: "Roth IRA" })).toBeAttached();
  await expect(firstSelect.locator("option", { hasText: "Traditional 401k" })).toBeAttached();
});

test("full sync: Vanguard → ProjectionLab", async ({ context, popupBaseUrl }) => {
  const vanguardPage = await context.newPage();
  await vanguardPage.goto(VANGUARD_URL);

  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

  // Step 1: pull Vanguard accounts (before opening PL tab to avoid race)
  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("Traditional 401k")).toBeVisible();

  // Step 2: open PL tab then pull PL accounts
  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();
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
  const alightPage = await context.newPage();
  await alightPage.goto(ALIGHT_URL);

  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  await popup.getByRole("button", { name: "Alight" }).click();
  await popup.getByRole("button", { name: /↻ Alight/ }).click();

  await expect(popup.getByText("401(k) \u2014 Core")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("HSA \u2014 Health Savings")).toBeVisible();
  await expect(popup.getByText("$1,650")).toBeVisible();
  await expect(popup.getByText("$1,050")).toBeVisible();
});

test("full sync: Alight → ProjectionLab", async ({ context, popupBaseUrl }) => {
  const alightPage = await context.newPage();
  await alightPage.goto(ALIGHT_URL);

  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  await popup.getByRole("button", { name: "Alight" }).click();

  // Step 1: pull Alight accounts
  await popup.getByRole("button", { name: /↻ Alight/ }).click();
  await expect(popup.getByText("401(k) \u2014 Core")).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText("HSA \u2014 Health Savings")).toBeVisible();

  // Step 2: open PL tab then pull PL accounts
  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();
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
  await context.newPage().then((p) => p.goto(VANGUARD_URL));
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

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
  await context.newPage().then((p) => p.goto(VANGUARD_URL));
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();
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
  await context.newPage().then((p) => p.goto(VANGUARD_URL));
  let popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();
  await expect(popup.locator("select").first()).toBeEnabled({
    timeout: 10_000,
  });
  await popup.locator("select").nth(0).selectOption("pl-roth-ira");

  // Close popup and reopen — mappings/accounts should rehydrate from storage
  await popup.close();
  popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

  await expect(popup.locator("select").first()).toHaveValue("pl-roth-ira", {
    timeout: 10_000,
  });
});

test("switching plugins preserves previously refreshed source data", async ({
  context,
  popupBaseUrl,
}) => {
  await context.newPage().then((p) => p.goto(VANGUARD_URL));
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

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
  await context.newPage().then((p) => p.goto(VANGUARD_URL));
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);

  await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
  await expect(popup.getByText("Roth IRA")).toBeVisible({ timeout: 10_000 });

  await context.newPage().then((p) => p.goto(PL_URL));
  await popup.getByRole("button", { name: "↻ ProjectionLab" }).click();
  await expect(popup.locator("select").first()).toBeEnabled({
    timeout: 10_000,
  });
  await popup.locator("select").nth(0).selectOption("pl-roth-ira");

  const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
  await syncBtn.click();
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });

  // Capture lastSynced, trigger second sync, verify timestamp advanced
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const first = await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.get("lastSynced_vanguard"),
  );

  await syncBtn.click();
  await expect(popup.getByText(/✓.*Roth IRA/)).toBeVisible({ timeout: 10_000 });

  await expect
    .poll(
      async () =>
        (
          await sw.evaluate(() =>
            (globalThis as any).chrome.storage.local.get("lastSynced_vanguard"),
          )
        ).lastSynced_vanguard,
      { timeout: 5_000 },
    )
    .toBeGreaterThan(first.lastSynced_vanguard);
});
