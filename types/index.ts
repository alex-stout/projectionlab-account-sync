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

/**
 * One leg of a split mapping: a portion of a single source balance routed to
 * a specific PL account. `mode` decides how `value` is interpreted:
 * - `percent` — `value` is 0–100, leg amount = total × value/100
 * - `fixed` — `value` is an absolute dollar amount
 * - `remainder` — `value` is ignored; leg absorbs whatever the other legs leave
 */
export type SplitLeg =
	| { plId: PLAccountId; mode: "percent"; value: number }
	| { plId: PLAccountId; mode: "fixed"; value: number }
	| { plId: PLAccountId; mode: "remainder" };

/**
 * Split a single source account across multiple PL accounts. Used as an
 * alternative to a plain `PLAccountId` in the `PLMappings` value union.
 */
export type SplitMapping = { splits: SplitLeg[] };

/**
 * `sourceAccountKey` → `plAccountId` (single target) **or** `SplitMapping`
 * (split across multiple targets). One entry per mapped source row.
 *
 * Use `isSplitMapping` (in `~/lib/storage`) to discriminate the union.
 */
export type PLMappings = Record<SourceAccountKey, PLAccountId | SplitMapping>;

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
