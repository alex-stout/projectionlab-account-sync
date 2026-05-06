import {
	type ApiPlugin,
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

import type { Account, Credentials, PLMappings, PlAccount } from "~/types";

/**
 * The key used to look up a source account in the mapping table.
 * Prefer the stable `accountId` when present; fall back to `name`.
 *
 * Use this anywhere you need to read/write a single mapping entry so
 * scraper code and `SYNC_TO_PL` agree on the key shape.
 *
 * @param account Source account.
 * @returns The string used as the key in `PLMappings`.
 */
export function getMappingKey(
	account: Pick<Account, "accountId" | "name">,
): string {
	return account.accountId ?? account.name;
}

/**
 * Reads the list of accounts most recently scraped/fetched for a plugin.
 *
 * @param sourceId Plugin id
 * @returns The stored `Account[]`, or `[]` if nothing has been stored yet.
 */
export async function getAccounts(sourceId: string): Promise<Account[]> {
	const stored = await browser.storage.local.get(accountsKey(sourceId));

	const accounts = stored[accountsKey(sourceId)] as Account[] | undefined;

	return accounts ?? [];
}

/**
 * Persists a fresh `Account[]` for a plugin and sets `lastRefreshed`
 * with the current time.
 *
 * @param sourceId Plugin id.
 * @param accounts The accounts read from the source.
 */
export async function setAccounts(
	sourceId: string,
	accounts: Account[],
): Promise<void> {
	await browser.storage.local.set({
		[accountsKey(sourceId)]: accounts,
		[lastRefreshedKey(sourceId)]: Date.now(),
	});
}

/**
 * Reads a plugin's source-account to PL Account mapping table. Returns empty object if
 * no mappings exist for plugin yet.
 *
 * @param sourceId Plugin id.
 * @returns The stored `PLMappings`, or `{}`
 */
export async function getMappings(sourceId: string): Promise<PLMappings> {
	const stored = await browser.storage.local.get(mappingsKey(sourceId));

	const mappings = stored[mappingsKey(sourceId)] as PLMappings | undefined;

	return mappings ?? {};
}

/**
 * Sets a plugin's full mapping table. This is a replacement not a merge, so pass
 * the full mapping table each time.
 *
 * @param sourceId Plugin id.
 * @param mappings The complete mapping table to persist.
 */
export async function setMappings(
	sourceId: string,
	mappings: PLMappings,
): Promise<void> {
	await browser.storage.local.set({ [mappingsKey(sourceId)]: mappings });
}

/**
 * Reads stored credential values for an API-kind plugin.
 *
 * @param sourceId Plugin id.
 * @returns Credentials
 */
export async function getCreds(sourceId: string): Promise<Credentials> {
	const stored = await browser.storage.local.get(credsKey(sourceId));
	return (stored[credsKey(sourceId)] as Credentials | undefined) ?? {};
}

/**
 * Persists credential values for an API-kind plugin.
 *
 * @param sourceId Plugin id.
 * @param creds Plugin credentials
 */
export async function setCreds(
	sourceId: string,
	creds: Credentials,
): Promise<void> {
	await browser.storage.local.set({ [credsKey(sourceId)]: creds });
}

/**
 * Removes a plugin's credentials entirely.
 *
 * @param sourceId Plugin id.
 */
export async function clearCreds(sourceId: string): Promise<void> {
	await browser.storage.local.remove(credsKey(sourceId));
}

/**
 * Marks a plugin as synced with a timestamp when called.
 *
 * @param sourceId Plugin id.
 */
export async function setLastSynced(sourceId: string): Promise<void> {
	await browser.storage.local.set({ [lastSyncedKey(sourceId)]: Date.now() });
}

/**
 * Reads the stored ProjectionLab API key.
 *
 * @returns The stored key, or `null` if none is saved
 */
export async function getPlApiKey(): Promise<string | null> {
	const stored = await browser.storage.local.get(plApiKey);

	const value = stored[plApiKey] as string | undefined;

	return value ?? null;
}

/**
 * Persists the user's ProjectionLab API key.
 *
 * @param value API key.
 */
export async function setPLApiKey(value: string): Promise<void> {
	await browser.storage.local.set({ [plApiKey]: value });
}

/**
 * Removes the stored ProjectionLab API key.
 */
export async function clearPLApiKey(): Promise<void> {
	await browser.storage.local.remove(plApiKey);
}

/**
 * Fetches stored ProjectionLab accounts.
 *
 * @returns The stored `PlAccount[]`, or `[]` if not yet fetched.
 */
export async function getPLAccounts(): Promise<PlAccount[]> {
	const stored = await browser.storage.local.get("plAccounts");
	return (stored.plAccounts as PlAccount[] | undefined) ?? [];
}

/**
 * Persists the latest fetched ProjectionLab account list including a fetch
 * timestamp.
 *
 * @param accounts ProjectionLab accounts.
 */
export async function setPLAccounts(accounts: PlAccount[]): Promise<void> {
	await browser.storage.local.set({
		plAccounts: accounts,
		[plLastRefreshedKey]: Date.now(),
	});
}

/**
 * Reads the list of plugin ids the user has toggled off.
 *
 * @returns Plugin ids disabled, or `[]` if all enabled.
 */
export async function getDisabledPlugins(): Promise<string[]> {
	const stored = await browser.storage.local.get(disabledPluginsKey);
	return (stored[disabledPluginsKey] as string[] | undefined) ?? [];
}

/**
 * Persists the disabled-plugin list. Replaces the previous
 * value.
 *
 * @param ids Plugin ids to mark disabled.
 */
export async function setDisabledPlugins(ids: string[]): Promise<void> {
	await browser.storage.local.set({ [disabledPluginsKey]: ids });
}

/**
 * Bulk-read every value the popup needs at startup in a single IPC.
 * One IPC for N keys is faster than N individual helper calls.
 */
export async function getAppHydration(): Promise<{
	hasApiKey: boolean;
	plAccounts: PlAccount[];
	plLastRefreshed: number | null;
	disabledPlugins: string[];
	lastSynced: Record<string, number>;
	lastRefreshed: Record<string, number>;
}> {
	const keys = [
		plApiKey,
		"plAccounts",
		plLastRefreshedKey,
		disabledPluginsKey,
		...PLUGINS.map((p) => lastSyncedKey(p.id)),
		...PLUGINS.map((p) => lastRefreshedKey(p.id)),
	];

	const stored = await browser.storage.local.get(keys);

	const lastSynced: Record<string, number> = {};
	const lastRefreshed: Record<string, number> = {};

	for (const plugin of PLUGINS) {
		const synced = stored[lastSyncedKey(plugin.id)];
		const refreshed = stored[lastRefreshedKey(plugin.id)];

		if (typeof synced === "number") lastSynced[plugin.id] = synced;
		if (typeof refreshed === "number") lastRefreshed[plugin.id] = refreshed;
	}

	const plAccounts = stored.plAccounts as PlAccount[] | undefined;
	const plLastRefreshed = stored[plLastRefreshedKey] as number | undefined;
	const disabledPlugins = stored[disabledPluginsKey] as string[] | undefined;

	return {
		hasApiKey: !!(stored[plApiKey] as string | undefined),
		plAccounts: plAccounts ?? [],
		plLastRefreshed: plLastRefreshed ?? null,
		disabledPlugins: disabledPlugins ?? [],
		lastSynced,
		lastRefreshed,
	};
}

/**
 * Bulk-read accounts + mappings for one plugin in a single IPC.
 * Used by `SourcePanel` on mount.
 */
export async function getSourceState(sourceId: string): Promise<{
	accounts: Account[];
	mappings: PLMappings;
}> {
	const stored = await browser.storage.local.get([
		accountsKey(sourceId),
		mappingsKey(sourceId),
	]);

	const accounts = stored[accountsKey(sourceId)] as Account[] | undefined;
	const mappings = stored[mappingsKey(sourceId)] as PLMappings | undefined;

	return {
		accounts: accounts ?? [],
		mappings: mappings ?? {},
	};
}

/**
 * For each PL account id, lists the other source plugins (excluding `currentSourceId`)
 * that have a mapping pointing to it. Used to surface cross-source aggregation
 * to the user.
 *
 * @param currentSourceId Plugin id of the currently-viewed source.
 * @returns `plId` → array of *other* source plugin ids mapping to it.
 */
export async function getOtherSourceMappings(
	currentSourceId: string,
): Promise<Record<string, string[]>> {
	const otherPlugins = PLUGINS.filter(
		(plugin) => plugin.id !== currentSourceId,
	);

	const stored = await browser.storage.local.get(
		otherPlugins.map((plugin) => mappingsKey(plugin.id)),
	);

	const result: Record<string, string[]> = {};

	for (const plugin of otherPlugins) {
		const m = stored[mappingsKey(plugin.id)] as PLMappings | undefined;

		if (!m) continue;

		for (const plId of Object.values(m)) {
			if (!result[plId]) result[plId] = [];
			result[plId].push(plugin.id);
		}
	}
	return result;
}

/**
 * Removes every key this extension writes: API key, PL account cache,
 * disabled-plugin list, and per-plugin accounts/mappings/timestamps/creds.
 */
export async function clearAllData(): Promise<void> {
	const apiPlugins = PLUGINS.filter((p): p is ApiPlugin => p.kind === "api");

	const keys = [
		"plAccounts",
		plApiKey,
		plLastRefreshedKey,
		disabledPluginsKey,
		...PLUGINS.flatMap((p) => [
			accountsKey(p.id),
			mappingsKey(p.id),
			lastSyncedKey(p.id),
			lastRefreshedKey(p.id),
		]),
		...apiPlugins.map((p) => credsKey(p.id)),
	];

	await browser.storage.local.remove(keys);
}
