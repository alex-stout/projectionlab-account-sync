import { test, expect } from "./fixtures";

test.beforeEach(async ({ page, popupBaseUrl, context }) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");
  await sw.evaluate(() => (globalThis as any).chrome.storage.local.clear());
  await page.goto(`${popupBaseUrl}/popup.html`);
});

test("YNAB appears as a plugin in the sidebar", async ({ page }) => {
  await expect(page.getByTitle("YNAB")).toBeVisible();
});

test("Settings panel renders a YNAB Credentials section", async ({ page }) => {
  await page.getByTitle("Settings").click();
  await expect(page.getByText("YNAB Credentials")).toBeVisible();
  await expect(page.getByText("Personal Access Token")).toBeVisible();
  await expect(
    page.getByText(/Generate one in YNAB/i),
  ).toBeVisible();
});

test("YNAB Save button is disabled until a token is entered", async ({
  page,
}) => {
  await page.getByTitle("Settings").click();
  const saveButtons = page.getByRole("button", { name: /^Save$/ });
  // [0] = PL key Save, [1] = YNAB Save
  await expect(saveButtons.nth(1)).toBeDisabled();

  const tokenInput = page.locator('input[type="password"]').nth(1);
  await tokenInput.fill("test-ynab-token");
  await expect(saveButtons.nth(1)).toBeEnabled();
});

test("Saving a YNAB token persists to storage and shows Saved feedback", async ({
  page,
  context,
}) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");

  await page.getByTitle("Settings").click();
  await page.locator('input[type="password"]').nth(1).fill("tok-123");
  await page.getByRole("button", { name: /^Save$/ }).nth(1).click();
  await expect(page.getByRole("button", { name: /✓ Saved/ })).toBeVisible();

  const stored = await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.get("creds_ynab"),
  );
  expect(stored.creds_ynab).toEqual({ accessToken: "tok-123" });
});

test("Saving YNAB creds lights up the availability dot without a reload", async ({
  page,
}) => {
  const ynabBtn = page.getByTitle("YNAB");
  await expect(ynabBtn.locator(".bg-green-400")).toBeHidden();

  await page.getByTitle("Settings").click();
  await page.locator('input[type="password"]').nth(1).fill("tok-123");
  await page.getByRole("button", { name: /^Save$/ }).nth(1).click();
  await expect(page.getByRole("button", { name: /✓ Saved/ })).toBeVisible();

  await expect(ynabBtn.locator(".bg-green-400")).toBeVisible();
});

test("Clearing YNAB creds turns the availability dot off without a reload", async ({
  page,
  context,
}) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");
  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      creds_ynab: { accessToken: "seeded" },
    }),
  );
  await page.reload();

  const ynabBtn = page.getByTitle("YNAB");
  await expect(ynabBtn.locator(".bg-green-400")).toBeVisible();

  await page.getByTitle("Settings").click();
  // YNAB Clear button is the second "Clear" (first is PL key's)
  await page.getByRole("button", { name: "Clear" }).last().click();
  await expect(ynabBtn.locator(".bg-green-400")).toBeHidden();
});

test("Refreshing YNAB fetches accounts from the API and renders them", async ({
  page,
  context,
}) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");

  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      creds_ynab: { accessToken: "test-token" },
    }),
  );

  await context.route("https://api.ynab.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          accounts: [
            {
              id: "a-1",
              name: "Checking",
              balance: 1_234_000,
              closed: false,
              deleted: false,
            },
            {
              id: "a-2",
              name: "Savings",
              balance: 10_000_000,
              closed: false,
              deleted: false,
            },
            {
              id: "a-3",
              name: "Closed Card",
              balance: 0,
              closed: true,
              deleted: false,
            },
          ],
        },
      }),
    });
  });

  await page.reload();
  await page.getByTitle("YNAB").click();
  await page.getByRole("button", { name: /↻ YNAB/ }).click();

  await expect(page.getByText("Checking")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Savings")).toBeVisible();
  // Closed accounts are filtered out
  await expect(page.getByText("Closed Card")).toBeHidden();
});

test("YNAB refresh shows an error when the API returns 401", async ({
  page,
  context,
}) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");

  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      creds_ynab: { accessToken: "bad-token" },
    }),
  );

  await context.route("https://api.ynab.com/**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "unauthorized" }),
    });
  });

  await page.reload();
  await page.getByTitle("YNAB").click();
  await page.getByRole("button", { name: /↻ YNAB/ }).click();

  await expect(page.getByText(/rejected the access token/i)).toBeVisible({
    timeout: 10_000,
  });
});

test("YNAB refresh shows an error when credentials are not set", async ({
  page,
  context,
}) => {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent("serviceworker");

  // Ensure no creds set
  await sw.evaluate(() =>
    (globalThis as any).chrome.storage.local.remove("creds_ynab"),
  );

  await page.reload();
  await page.getByTitle("YNAB").click();
  await page.getByRole("button", { name: /↻ YNAB/ }).click();

  await expect(page.getByText(/credentials are not set/i)).toBeVisible({
    timeout: 10_000,
  });
});
