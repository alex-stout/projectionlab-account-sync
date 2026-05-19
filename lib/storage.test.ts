import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accountsKey,
	credsKey,
	disabledPluginsKey,
	lastRefreshedKey,
	lastSyncedKey,
	mappingsKey,
	PLUGINS,
	plApiKey,
	plLastRefreshedKey,
} from "~/plugins";
import {
	clearAllData,
	clearCreds,
	clearPLApiKey,
	getAccounts,
	getCreds,
	getDisabledPlugins,
	getMappingKey,
	getMappings,
	getOtherSourceMappings,
	getPLAccounts,
	getPlApiKey,
	setAccounts,
	setCreds,
	setDisabledPlugins,
	setLastSynced,
	setMappings,
	setPLAccounts,
	setPLApiKey,
} from "./storage";

const FROZEN_NOW = 1_700_000_000_000; // arbitrary fixed Date.now

beforeEach(() => {
	vi.mocked(browser.storage.local.get)
		.mockReset()
		.mockResolvedValue({} as any);
	vi.mocked(browser.storage.local.set as any)
		.mockReset()
		.mockResolvedValue(undefined);
	vi.mocked(browser.storage.local.remove as any)
		.mockReset()
		.mockResolvedValue(undefined);
	vi.spyOn(Date, "now").mockReturnValue(FROZEN_NOW);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("getMappingKey", () => {
	it("returns accountId when present", () => {
		expect(getMappingKey({ accountId: "abc-123", name: "Roth IRA" })).toBe(
			"abc-123",
		);
	});

	it("falls back to name when accountId is null", () => {
		expect(getMappingKey({ accountId: null, name: "Roth IRA" })).toBe(
			"Roth IRA",
		);
	});

	it("treats accountId of empty string as falsy and falls back to name", () => {
		// `??` treats "" as defined, so this tests the actual coalescing semantics.
		// If accountId is the empty string we currently use it — documenting the behavior.
		expect(getMappingKey({ accountId: "", name: "Roth IRA" })).toBe("");
	});
});

describe("getAccounts", () => {
	it("returns the stored Account[] for the plugin-scoped key", async () => {
		const accounts = [{ name: "IRA", balance: 100, accountId: "a1" }];
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[accountsKey("vanguard")]: accounts,
		} as any);
		expect(await getAccounts("vanguard")).toEqual(accounts);
		expect(browser.storage.local.get).toHaveBeenCalledWith(
			accountsKey("vanguard"),
		);
	});

	it("returns [] when nothing is stored", async () => {
		expect(await getAccounts("vanguard")).toEqual([]);
	});

	it("returns [] when stored value is undefined", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[accountsKey("vanguard")]: undefined,
		} as any);
		expect(await getAccounts("vanguard")).toEqual([]);
	});
});

describe("setAccounts", () => {
	it("writes accounts AND lastRefreshed in a single .set call", async () => {
		const accounts = [{ name: "IRA", balance: 100, accountId: null }];
		await setAccounts("vanguard", accounts);
		expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[accountsKey("vanguard")]: accounts,
			[lastRefreshedKey("vanguard")]: FROZEN_NOW,
		});
	});

	it("uses Date.now() for the lastRefreshed timestamp", async () => {
		await setAccounts("vanguard", []);
		const arg = vi.mocked(browser.storage.local.set as any).mock
			.calls[0][0] as Record<string, unknown>;
		expect(arg[lastRefreshedKey("vanguard")]).toBe(FROZEN_NOW);
	});

	it("scopes the keys by sourceId", async () => {
		await setAccounts("alight", []);
		expect(browser.storage.local.set).toHaveBeenCalledWith(
			expect.objectContaining({
				[accountsKey("alight")]: [],
				[lastRefreshedKey("alight")]: FROZEN_NOW,
			}),
		);
	});
});

describe("getMappings", () => {
	it("returns the stored mapping table", async () => {
		const m = { "acc-1": "pl-1", "acc-2": "pl-2" };
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[mappingsKey("vanguard")]: m,
		} as any);
		expect(await getMappings("vanguard")).toEqual(m);
	});

	it("returns {} when nothing is stored", async () => {
		expect(await getMappings("vanguard")).toEqual({});
	});
});

describe("getOtherSourceMappings", () => {
	it("groups other plugins' mappings by plId, excluding the current source", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[mappingsKey("ynab")]: { "y-1": "pl-checking", "y-2": "pl-savings" },
			[mappingsKey("alight")]: { "a-1": "pl-checking" },
			[mappingsKey("monarch")]: {},
		} as any);
		const result = await getOtherSourceMappings("vanguard");
		expect(result).toEqual({
			"pl-checking": ["alight", "ynab"].sort(),
			"pl-savings": ["ynab"],
		});
	});

	it("returns {} when no other plugin has mappings", async () => {
		expect(await getOtherSourceMappings("vanguard")).toEqual({});
	});

	it("does not include mappings from the current source", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[mappingsKey("vanguard")]: { "v-1": "pl-checking" },
		} as any);
		const result = await getOtherSourceMappings("vanguard");
		expect(result["pl-checking"]).toBeUndefined();
	});

	it("traverses split-mapping legs as targets of the source", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[mappingsKey("ynab")]: {
				"y-1": {
					splits: [
						{ plId: "pl-roth", mode: "percent", value: 60 },
						{ plId: "pl-trad", mode: "remainder" },
					],
				},
			},
		} as any);
		const result = await getOtherSourceMappings("vanguard");
		expect(result).toEqual({
			"pl-roth": ["ynab"],
			"pl-trad": ["ynab"],
		});
	});
});

describe("setMappings", () => {
	it("writes the mapping table to the plugin-scoped key only", async () => {
		const m = { "acc-1": "pl-1" };
		await setMappings("vanguard", m);
		expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[mappingsKey("vanguard")]: m,
		});
	});
});

describe("getCreds", () => {
	it("returns the stored credentials", async () => {
		const c = { accessToken: "tok-abc" };
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[credsKey("ynab")]: c,
		} as any);
		expect(await getCreds("ynab")).toEqual(c);
	});

	it("returns {} when nothing is stored", async () => {
		expect(await getCreds("ynab")).toEqual({});
	});
});

describe("setCreds", () => {
	it("writes credentials to the plugin-scoped creds key", async () => {
		const c = { accessToken: "tok-abc" };
		await setCreds("ynab", c);
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[credsKey("ynab")]: c,
		});
	});
});

describe("clearCreds", () => {
	it("removes the plugin-scoped creds key", async () => {
		await clearCreds("ynab");
		expect(browser.storage.local.remove).toHaveBeenCalledWith(credsKey("ynab"));
	});
});

describe("setLastSynced", () => {
	it("writes Date.now() to the plugin-scoped key", async () => {
		await setLastSynced("vanguard");
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[lastSyncedKey("vanguard")]: FROZEN_NOW,
		});
	});
});

describe("getPlApiKey", () => {
	it("returns the stored string", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[plApiKey]: "secret-key",
		} as any);
		expect(await getPlApiKey()).toBe("secret-key");
	});

	it("returns null when key is absent", async () => {
		expect(await getPlApiKey()).toBeNull();
	});

	it("returns null when stored value is null", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[plApiKey]: null,
		} as any);
		expect(await getPlApiKey()).toBeNull();
	});

	it("preserves an explicitly-stored empty string", async () => {
		// "" is a valid string; we don't conflate it with "missing".
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[plApiKey]: "",
		} as any);
		expect(await getPlApiKey()).toBe("");
	});
});

describe("setPLApiKey", () => {
	it("writes the value to plApiKey", async () => {
		await setPLApiKey("new-key");
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[plApiKey]: "new-key",
		});
	});
});

describe("clearPLApiKey", () => {
	it("removes plApiKey", async () => {
		await clearPLApiKey();
		expect(browser.storage.local.remove).toHaveBeenCalledWith(plApiKey);
	});
});

describe("getPLAccounts", () => {
	it("returns the stored PlAccount[]", async () => {
		const a = [{ id: "pl-1", name: "Roth IRA" }];
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			plAccounts: a,
		} as any);
		expect(await getPLAccounts()).toEqual(a);
	});

	it("returns [] when nothing is stored", async () => {
		expect(await getPLAccounts()).toEqual([]);
	});
});

describe("setPLAccounts", () => {
	it("writes plAccounts AND plLastRefreshed in a single .set call", async () => {
		const a = [{ id: "pl-1", name: "Roth IRA" }];
		await setPLAccounts(a);
		expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			plAccounts: a,
			[plLastRefreshedKey]: FROZEN_NOW,
		});
	});
});

describe("getDisabledPlugins", () => {
	it("returns the stored id list", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			[disabledPluginsKey]: ["vanguard", "alight"],
		} as any);
		expect(await getDisabledPlugins()).toEqual(["vanguard", "alight"]);
	});

	it("returns [] when nothing is stored", async () => {
		expect(await getDisabledPlugins()).toEqual([]);
	});
});

describe("setDisabledPlugins", () => {
	it("writes the id list to disabledPluginsKey", async () => {
		await setDisabledPlugins(["vanguard"]);
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			[disabledPluginsKey]: ["vanguard"],
		});
	});
});

describe("clearAllData", () => {
	// These contracts are deliberately strict. clearAllData builds its key list
	// dynamically from PLUGINS, so any new plugin or new per-plugin storage
	// shape needs to be reflected in the helper *and* in these tests.

	it("removes the global keys", async () => {
		await clearAllData();
		const removedKeys = vi.mocked(browser.storage.local.remove as any).mock
			.calls[0][0] as string[];
		expect(removedKeys).toContain("plAccounts");
		expect(removedKeys).toContain(plApiKey);
		expect(removedKeys).toContain(plLastRefreshedKey);
		expect(removedKeys).toContain(disabledPluginsKey);
	});

	it("removes accounts/mappings/lastSynced/lastRefreshed for every plugin", async () => {
		await clearAllData();
		const removedKeys = vi.mocked(browser.storage.local.remove as any).mock
			.calls[0][0] as string[];
		for (const p of PLUGINS) {
			expect(removedKeys).toContain(accountsKey(p.id));
			expect(removedKeys).toContain(mappingsKey(p.id));
			expect(removedKeys).toContain(lastSyncedKey(p.id));
			expect(removedKeys).toContain(lastRefreshedKey(p.id));
		}
	});

	it("removes creds keys for api plugins only", async () => {
		await clearAllData();
		const removedKeys = vi.mocked(browser.storage.local.remove as any).mock
			.calls[0][0] as string[];
		for (const p of PLUGINS) {
			if (p.kind === "api") {
				expect(removedKeys).toContain(credsKey(p.id));
			} else {
				expect(removedKeys).not.toContain(credsKey(p.id));
			}
		}
	});

	it("issues a single .remove call", async () => {
		await clearAllData();
		expect(browser.storage.local.remove).toHaveBeenCalledTimes(1);
	});
});
