/** A scraped or fetched account from a source plugin (Vanguard, YNAB, etc.). */
export type Account = {
	name: string;
	balance: number;
	accountId: string | null;
};

/** A ProjectionLab account: a row in PL's accounts list, mappable from a source. */
export type PlAccount = { id: string; name: string };

/** A ProjectionLab account id (the `id` field on `PlAccount`). */
export type PLAccountId = string;

/**
 * The key used to look up a source account in the mapping table:
 * `accountId` when present (stable across renames), `name` as fallback.
 * @see getMappingKey in `~/lib/storage`
 */
export type SourceAccountKey = string;

/** `sourceAccountKey` → `plAccountId`. One entry per mapped source row. */
export type PLMappings = Record<SourceAccountKey, PLAccountId>;

/** Credential field id (e.g. `"accessToken"`) → user-entered value. */
export type Credentials = Record<string, string>;

/** Data needed for storing the sync */
export type SyncEntry = { plId: string; balance: number; name: string };

/** Result of a single sync operation pushed to ProjectionLab. */
export type SyncResult = { name: string; ok: boolean; error?: string };

export type PlSyncState =
	| { status: "idle" }
	| { status: "syncing" }
	| { status: "done"; results: SyncResult[] }
	| { status: "error"; message: string };
