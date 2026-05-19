import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
	clearStorage,
	getServiceWorker,
	openMockTab,
	openPopup,
	seedStorage,
} from "./helpers";

const VANGUARD_URL = "http://localhost:3000/vanguard/";
const ALIGHT_URL = "http://localhost:3000/alight/";
const PL_URL = "http://localhost:3000/projectionlab/";

// Vanguard mock balances (kept in sync with mock-sites/vanguard):
// Roth IRA $1200, Traditional 401k $1850, 529 College Savings $1500.
// Alight mock: 401(k) — Core $1650, HSA — Health Savings $1050.

test.beforeEach(async ({ context }) => {
	const sw = await getServiceWorker(context);
	await clearStorage(sw);
	await seedStorage(sw, { plApiKey: "test-key" });
});

/**
 * Bring the popup to a state where:
 * - Vanguard accounts are scraped & visible
 * - PL accounts are loaded into dropdowns
 * - The active panel is Vanguard
 *
 * Returns the popup `Page` and the PL mock `Page` (so callers can read
 * `__mockPlUpdates` after a sync).
 */
async function setupVanguardWithPL(
	context: Parameters<typeof openPopup>[0],
	popupBaseUrl: string,
): Promise<{ popup: Page; plPage: Page }> {
	await openMockTab(context, VANGUARD_URL);
	const popup = await openPopup(context, popupBaseUrl);

	await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
	await expect(popup.getByText("Roth IRA").first()).toBeVisible({
		timeout: 10_000,
	});

	const plPage = await openMockTab(context, PL_URL);
	await popup.getByTitle("Settings").click();
	await popup.getByRole("button", { name: "↻ Refresh" }).click();
	await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });
	await popup.getByTitle("Vanguard").click();
	await expect(popup.locator("select").first()).toBeEnabled({
		timeout: 10_000,
	});

	return { popup, plPage };
}

/** Scope to the SplitEditor card for the Nth account row (1-based). */
function legSelect(popup: Page, legIndex: number) {
	return popup.getByRole("combobox", {
		name: new RegExp(`Split leg ${legIndex} PL account`, "i"),
	});
}

function legValue(popup: Page, legIndex: number) {
	return popup.getByRole("spinbutton", {
		name: new RegExp(`Split leg ${legIndex} value`, "i"),
	});
}

/**
 * Click the mode pill for a given leg. The fieldset has an `sr-only` legend
 * "Split leg N mode" so we scope by it.
 */
async function setLegMode(
	popup: Page,
	legIndex: number,
	mode: "%" | "$" | "rest",
) {
	const fieldset = popup.locator(
		`fieldset:has(legend:has-text("Split leg ${legIndex} mode"))`,
	);
	await fieldset.getByRole("button", { name: mode, exact: true }).click();
}

test("percent split distributes balance across two PL accounts", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup, plPage } = await setupVanguardWithPL(context, popupBaseUrl);

	// Single-map the Roth IRA row first so the seed split picks it up at 100%.
	await popup.locator("select").nth(0).selectOption("pl-roth-ira");

	// Convert to a split.
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();

	// First leg seeded as 100% pl-roth-ira. Drop it to 60.
	await expect(legSelect(popup, 1)).toHaveValue("pl-roth-ira");
	await legValue(popup, 1).fill("60");

	// Add a second leg, point at pl-401k, percent stays default at 0 — set to 40.
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("pl-401k");
	await legValue(popup, 2).fill("40");

	// Status should read totals match.
	await expect(popup.getByText(/Total: \$1,200 of \$1,200/)).toBeVisible();

	const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
	await expect(syncBtn).toBeEnabled();
	await syncBtn.click();
	await expect(popup.getByText(/✓.*Roth IRA/).first()).toBeVisible({
		timeout: 10_000,
	});

	// Both PL accounts received their share. 60% × $1200 = $720, 40% = $480.
	const pushed = await plPage.evaluate(
		() => (window as any).__mockPlUpdates ?? {},
	);
	expect(pushed["pl-roth-ira"]).toBe(720);
	expect(pushed["pl-401k"]).toBe(480);
});

test("fixed leg paired with remainder pushes exact amounts", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup, plPage } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();

	// Leg 1: fixed $500 to pl-roth-ira.
	await setLegMode(popup, 1, "$");
	await legValue(popup, 1).fill("500");

	// Leg 2: remainder to pl-401k.
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("pl-401k");
	await setLegMode(popup, 2, "rest");

	const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
	await expect(syncBtn).toBeEnabled();
	await syncBtn.click();
	await expect(popup.getByText(/✓.*Roth IRA/).first()).toBeVisible({
		timeout: 10_000,
	});

	const pushed = await plPage.evaluate(
		() => (window as any).__mockPlUpdates ?? {},
	);
	expect(pushed["pl-roth-ira"]).toBe(500);
	expect(pushed["pl-401k"]).toBe(700); // $1200 − $500
});

test("ignored leg is dropped from sync entries", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup, plPage } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();

	// Leg 1: 60% to pl-roth-ira.
	await legValue(popup, 1).fill("60");

	// Leg 2: 40% to "Don't sync this portion".
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("__ignore__");
	await legValue(popup, 2).fill("40");

	// (ignored) annotation appears next to the resolved amount.
	await expect(popup.getByText(/\(ignored\)/i)).toBeVisible();

	const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
	await expect(syncBtn).toBeEnabled();
	await syncBtn.click();
	await expect(popup.getByText(/✓.*Roth IRA/).first()).toBeVisible({
		timeout: 10_000,
	});

	const pushed = await plPage.evaluate(
		() => (window as any).__mockPlUpdates ?? {},
	);
	// Only the real PL target was pushed; the ignored share went nowhere.
	expect(pushed["pl-roth-ira"]).toBe(720);
	expect(Object.keys(pushed)).toEqual(["pl-roth-ira"]);
});

test("under-allocated split disables the sync button until fixed", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();

	// Leg 1: 60% (under-allocated — 40% missing, no remainder).
	await legValue(popup, 1).fill("60");

	// Validation pill calls it out and the sync button is blocked.
	await expect(
		popup.getByText(/Percentages total 60.0% — should be 100%/i),
	).toBeVisible();
	const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
	await expect(syncBtn).toBeDisabled();
	await expect(
		popup.getByText(/Fix split allocation to enable sync/i),
	).toBeVisible();

	// Fix by adding a 40% leg.
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("pl-401k");
	await legValue(popup, 2).fill("40");

	await expect(syncBtn).toBeEnabled();
	await expect(
		popup.getByText(/Fix split allocation to enable sync/i),
	).toBeHidden();
});

test("over-allocated fixed legs disable the sync button", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();

	// Leg 1: fixed $1500 (over the $1200 balance).
	await setLegMode(popup, 1, "$");
	await legValue(popup, 1).fill("1500");

	await expect(popup.getByText(/Over-allocated by \$300/i)).toBeVisible();
	const syncBtn = popup.getByRole("button", { name: "Sync to ProjectionLab" });
	await expect(syncBtn).toBeDisabled();
});

test("split mapping persists across popup reopen and round-trips through storage", async ({
	context,
	popupBaseUrl,
}) => {
	let { popup } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();
	await legValue(popup, 1).fill("60");
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("pl-401k");
	await legValue(popup, 2).fill("40");

	await expect(popup.getByText(/Total: \$1,200 of \$1,200/)).toBeVisible();

	// Close and reopen the popup. The seeded PL key persists; PL accounts cache
	// in storage too. Vanguard accounts were stored on refresh.
	await popup.close();
	popup = await openPopup(context, popupBaseUrl);

	// The split editor rehydrates with both legs at the same values.
	await expect(legSelect(popup, 1)).toHaveValue("pl-roth-ira");
	await expect(legValue(popup, 1)).toHaveValue("60");
	await expect(legSelect(popup, 2)).toHaveValue("pl-401k");
	await expect(legValue(popup, 2)).toHaveValue("40");

	// Storage shape is the union { splits: [...] }, not a plain string.
	const sw = await getServiceWorker(context);
	const stored = (await sw.evaluate(() =>
		(globalThis as any).chrome.storage.local.get("mappings_vanguard"),
	)) as { mappings_vanguard: Record<string, unknown> };
	const entry = stored.mappings_vanguard["111"]; // Roth IRA accountId per the Vanguard mock
	expect(entry).toEqual({
		splits: [
			{ plId: "pl-roth-ira", mode: "percent", value: 60 },
			{ plId: "pl-401k", mode: "percent", value: 40 },
		],
	});
});

test("split leg composes additively with another source's mapping to the same PL account", async ({
	context,
	popupBaseUrl,
}) => {
	// Setup: refresh both Vanguard and Alight, then load PL accounts.
	await openMockTab(context, VANGUARD_URL);
	await openMockTab(context, ALIGHT_URL);

	const popup = await openPopup(context, popupBaseUrl);
	await popup.getByRole("button", { name: /↻ Vanguard/ }).click();
	await expect(popup.getByText("Roth IRA").first()).toBeVisible({
		timeout: 10_000,
	});
	await popup.getByTitle("Alight").click();
	await popup.getByRole("button", { name: /↻ Alight/ }).click();
	await expect(popup.getByText("401(k) — Core")).toBeVisible({
		timeout: 10_000,
	});

	const plPage = await openMockTab(context, PL_URL);
	await popup.getByTitle("Settings").click();
	await popup.getByRole("button", { name: "↻ Refresh" }).click();
	await expect(popup.getByText(/\d+ loaded/)).toBeVisible({ timeout: 10_000 });

	// Alight: map 401(k) — Core directly to pl-roth-ira.
	await popup.getByTitle("Alight").click();
	await expect(popup.locator("select").first()).toBeEnabled({
		timeout: 10_000,
	});
	await popup.locator("select").nth(0).selectOption("pl-roth-ira");

	// Vanguard: split Roth IRA → 60% pl-roth-ira, 40% pl-401k.
	await popup.getByTitle("Vanguard").click();
	await expect(popup.locator("select").first()).toBeEnabled({
		timeout: 10_000,
	});
	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();
	await legValue(popup, 1).fill("60");
	await popup.getByRole("button", { name: /\+ add target/i }).click();
	await legSelect(popup, 2).selectOption("pl-401k");
	await legValue(popup, 2).fill("40");

	// Sync from Vanguard. The split's 60% leg ($720) plus Alight's $1650 should
	// land in pl-roth-ira together.
	await popup.getByRole("button", { name: "Sync to ProjectionLab" }).click();
	await expect(popup.getByText(/✓.*Roth IRA/).first()).toBeVisible({
		timeout: 10_000,
	});

	const pushed = await plPage.evaluate(
		() => (window as any).__mockPlUpdates ?? {},
	);
	expect(pushed["pl-roth-ira"]).toBe(720 + 1650);
	expect(pushed["pl-401k"]).toBe(480); // 40% of $1200, untouched by Alight
});

test("Cancel split returns the row to a single-mapping select", async ({
	context,
	popupBaseUrl,
}) => {
	const { popup } = await setupVanguardWithPL(context, popupBaseUrl);

	await popup.locator("select").nth(0).selectOption("pl-roth-ira");
	await popup
		.getByRole("button", { name: /split into multiple/i })
		.first()
		.click();
	await expect(legSelect(popup, 1)).toBeVisible();

	await popup.getByRole("button", { name: /cancel split/i }).click();

	// Editor is gone; back to the single select with "Not mapped".
	await expect(legSelect(popup, 1)).toBeHidden();
	const firstSelect = popup.locator("select").first();
	await expect(firstSelect).toHaveValue("");
	await expect(
		firstSelect.locator("option", { hasText: "Not mapped" }),
	).toBeAttached();
});
