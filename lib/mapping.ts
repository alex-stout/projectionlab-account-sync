import type {
	Account,
	PLAccountId,
	SplitLeg,
	SplitMapping,
	SyncEntry,
} from "~/types";

/**
 * Sentinel `plId` used as a split-leg target to mean "intentionally don't sync
 * this portion of the source balance to PL." Legs with this target are dropped
 * by `expandToSyncCandidates` and excluded from `mappingTargets`, but pass the
 * `isSplitValid` "every leg has a plId selected" check — so users can express
 * partial syncs (e.g. "60% Roth, 40% ignored") without leaving validation in
 * an under-allocated state.
 */
export const IGNORE_PL_ID = "__ignore__";

/** True for the sentinel "don't sync" target. */
export function isIgnoreTarget(plId: string): boolean {
	return plId === IGNORE_PL_ID;
}

/** Type guard: does this mapping entry split across multiple PL accounts? */
export function isSplitMapping(
	entry: PLAccountId | SplitMapping | undefined,
): entry is SplitMapping {
	return (
		typeof entry === "object" &&
		entry !== null &&
		Array.isArray((entry as { splits?: unknown }).splits)
	);
}

/**
 * Returns every real PL account id this mapping entry targets — one for a
 * plain mapping, one-per-leg for a split mapping. Sentinel `IGNORE_PL_ID`
 * legs are filtered out so they never count as cross-source overlap targets.
 */
export function mappingTargets(
	entry: PLAccountId | SplitMapping | undefined,
): PLAccountId[] {
	if (!entry) return [];

	if (isSplitMapping(entry)) {
		return entry.splits
			.map((leg) => leg.plId)
			.filter((plId) => !isIgnoreTarget(plId));
	}

	if (isIgnoreTarget(entry)) return [];

	return [entry];
}

/**
 * Roll-up of a split's allocation math against a given balance. Single source
 * of truth used by `isSplitValid`, `expandToSyncCandidates`, and the
 * `SplitEditor` status pill — three places that must agree.
 */
export type SplitSummary = {
	/** Sum of all `fixed` legs (raw dollars). */
	fixedSum: number;
	/** Sum of `percent` legs resolved to dollars: Σ(balance × value / 100). */
	percentSum: number;
	/** Sum of `percent` legs' percentage values (e.g. 60 + 40 = 100). */
	percentTotal: number;
	/** How many legs are `remainder` mode. */
	remainderCount: number;
	/** Per-`remainder`-leg dollar share, or 0 if there are none. */
	remainderShare: number;
	/** Total dollars allocated across all legs (fixed + percent + remainder × N). */
	allocated: number;
	/** balance − allocated. Positive ⇒ under-allocated, negative ⇒ over. */
	unallocated: number;
};

/** Tolerance for "dollars match the balance" — guards float comparison. */
export const SPLIT_DOLLAR_TOLERANCE = 0.005;
/** Tolerance for "percent legs total 100" — guards float comparison. */
export const SPLIT_PERCENT_TOLERANCE = 0.01;

/** Compute the allocation roll-up for a split against a known balance. */
export function summarizeSplit(
	balance: number,
	splits: SplitLeg[],
): SplitSummary {
	let fixedSum = 0;
	let percentSum = 0;
	let percentTotal = 0;
	let remainderCount = 0;

	for (const leg of splits) {
		if (leg.mode === "fixed") {
			fixedSum += leg.value;
		} else if (leg.mode === "percent") {
			percentSum += (balance * leg.value) / 100;
			percentTotal += leg.value;
		} else {
			remainderCount += 1;
		}
	}

	const remainderShare =
		remainderCount > 0 ? (balance - fixedSum - percentSum) / remainderCount : 0;
	const allocated = fixedSum + percentSum + remainderShare * remainderCount;
	const unallocated = balance - allocated;

	return {
		fixedSum,
		percentSum,
		percentTotal,
		remainderCount,
		remainderShare,
		allocated,
		unallocated,
	};
}

/**
 * Discriminant-preserving setter for a leg's `plId`. Spreading `{...leg, plId}`
 * over a `SplitLeg` loses the union narrowing and forces `as` casts at the
 * call site — this helper keeps the discriminant intact instead.
 */
export function withLegPlId(leg: SplitLeg, plId: string): SplitLeg {
	return leg.mode === "remainder"
		? { plId, mode: "remainder" }
		: { plId, mode: leg.mode, value: leg.value };
}

/**
 * Discriminant-preserving setter for a `fixed`/`percent` leg's `value`. No-op
 * on `remainder` legs (which don't carry a value).
 */
export function withLegValue(leg: SplitLeg, value: number): SplitLeg {
	if (leg.mode === "remainder") return leg;
	return { plId: leg.plId, mode: leg.mode, value };
}

/**
 * Returns `true` when this mapping entry is a syncable shape:
 * - Plain (string) mappings are always considered valid here — emptiness is
 *   handled at the storage layer (an empty string is deleted from the table).
 * - Split mappings must:
 *   (a) have ≥1 leg
 *   (b) have a `plId` selected on every leg
 *   (c) not over-allocate
 *   (d) when there's no `remainder` leg, any percent legs must sum to ~100%
 *       and the resolved totals must match the account balance (no
 *       unallocated dollars).
 *
 * Returns `false` for splits when the account balance is `null`, since
 * over/under-allocation can't be checked without it.
 */
export function isSplitValid(
	balance: number | null,
	entry: PLAccountId | SplitMapping | undefined,
): boolean {
	if (!isSplitMapping(entry)) return true;
	if (balance === null) return false;
	if (entry.splits.length === 0) return false;
	if (entry.splits.some((leg) => !leg.plId)) return false;

	const { fixedSum, percentSum, percentTotal, remainderCount } = summarizeSplit(
		balance,
		entry.splits,
	);

	if (remainderCount > 0) {
		return balance >= 0
			? fixedSum + percentSum <= balance + SPLIT_DOLLAR_TOLERANCE
			: fixedSum + percentSum >= balance - SPLIT_DOLLAR_TOLERANCE;
	}

	if (
		entry.splits.some((l) => l.mode === "percent") &&
		Math.abs(percentTotal - 100) > SPLIT_PERCENT_TOLERANCE
	) {
		return false;
	}

	return Math.abs(fixedSum + percentSum - balance) <= SPLIT_DOLLAR_TOLERANCE;
}

/**
 * Expands one source account + its mapping entry into the set of
 * `{plId, balance, name}` candidates that should flow to the additive grouping pass.
 *
 * - Single mapping → one candidate carrying the full balance.
 * - Split mapping → one candidate per leg, with the leg's portion of the balance:
 *   - `fixed`: leg.value (as-is)
 *   - `percent`: total × value / 100
 *   - `remainder`: total − (fixed + percent), split equally if there are multiple remainder legs
 *
 * Legs targeting `IGNORE_PL_ID` or carrying an empty `plId` are dropped — the
 * former is the user's explicit "don't sync" choice; the latter is defense
 * against an unfinished edit slipping past validation.
 *
 * Returns `[]` when the account balance is null, the entry is missing, or the
 * split has no legs. Negative remainder values are passed through (so the user
 * can see when fixed/percent legs over-allocate).
 */
export function expandToSyncCandidates(
	account: Account,
	entry: PLAccountId | SplitMapping | undefined,
): SyncEntry[] {
	if (!entry || account.balance === null) return [];

	if (!isSplitMapping(entry)) {
		if (isIgnoreTarget(entry)) return [];
		return [{ plId: entry, balance: account.balance, name: account.name }];
	}

	if (entry.splits.length === 0) return [];

	const total = account.balance;
	const { remainderShare } = summarizeSplit(total, entry.splits);

	const candidates: SyncEntry[] = [];
	for (const leg of entry.splits) {
		if (!leg.plId || isIgnoreTarget(leg.plId)) continue;
		let balance: number;
		if (leg.mode === "fixed") balance = leg.value;
		else if (leg.mode === "percent") balance = (total * leg.value) / 100;
		else balance = remainderShare;
		candidates.push({ plId: leg.plId, balance, name: account.name });
	}
	return candidates;
}
