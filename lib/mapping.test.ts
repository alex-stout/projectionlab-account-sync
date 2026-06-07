import { describe, expect, it } from "vitest";
import type { Account, SplitMapping } from "~/types";
import {
	expandToSyncCandidates,
	IGNORE_PL_ID,
	isSplitMapping,
	isSplitValid,
	mappingTargets,
	summarizeSplit,
	withLegPlId,
	withLegValue,
} from "./mapping";

const acc = (balance: number | null = 1000): Account => ({
	name: "401k",
	balance: balance as number,
	accountId: "a-1",
});

describe("isSplitMapping", () => {
	it("returns false for plain string mappings", () => {
		expect(isSplitMapping("pl-1")).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isSplitMapping(undefined)).toBe(false);
	});

	it("returns true for an object with a splits array", () => {
		expect(isSplitMapping({ splits: [] })).toBe(true);
	});

	it("returns false for an object whose splits field is not an array", () => {
		// Defense against a corrupt or partially-migrated stored mapping.
		expect(isSplitMapping({ splits: 42 } as never)).toBe(false);
		expect(isSplitMapping({ splits: null } as never)).toBe(false);
	});
});

describe("summarizeSplit", () => {
	it("returns all-zero rollup for an empty split", () => {
		expect(summarizeSplit(1000, [])).toEqual({
			fixedSum: 0,
			percentSum: 0,
			percentTotal: 0,
			remainderCount: 0,
			remainderShare: 0,
			allocated: 0,
			unallocated: 1000,
		});
	});

	it("rolls up percent legs into dollars and a separate percent total", () => {
		const s = summarizeSplit(10_000, [
			{ plId: "a", mode: "percent", value: 60 },
			{ plId: "b", mode: "percent", value: 40 },
		]);
		expect(s.percentSum).toBe(10_000);
		expect(s.percentTotal).toBe(100);
		expect(s.allocated).toBe(10_000);
		expect(s.unallocated).toBe(0);
	});

	it("splits the remainder equally across N remainder legs", () => {
		const s = summarizeSplit(6000, [
			{ plId: "a", mode: "fixed", value: 1000 },
			{ plId: "b", mode: "remainder" },
			{ plId: "c", mode: "remainder" },
		]);
		expect(s.remainderShare).toBe(2500);
		expect(s.remainderCount).toBe(2);
		expect(s.allocated).toBe(6000);
		expect(s.unallocated).toBe(0);
	});

	it("reports negative unallocated when fixed/percent over-allocate", () => {
		const s = summarizeSplit(1000, [{ plId: "a", mode: "fixed", value: 1500 }]);
		expect(s.allocated).toBe(1500);
		expect(s.unallocated).toBe(-500);
	});
});

describe("withLegPlId / withLegValue", () => {
	it("preserves the discriminant when changing plId on a percent leg", () => {
		const next = withLegPlId({ plId: "a", mode: "percent", value: 60 }, "b");
		expect(next).toEqual({ plId: "b", mode: "percent", value: 60 });
	});

	it("does not introduce a value field when setting plId on a remainder leg", () => {
		const next = withLegPlId({ plId: "a", mode: "remainder" }, "b");
		expect(next).toEqual({ plId: "b", mode: "remainder" });
		expect("value" in next).toBe(false);
	});

	it("updates value on a fixed leg without altering plId or mode", () => {
		const next = withLegValue({ plId: "a", mode: "fixed", value: 500 }, 750);
		expect(next).toEqual({ plId: "a", mode: "fixed", value: 750 });
	});

	it("is a no-op on remainder legs (no value to set)", () => {
		const leg = { plId: "a", mode: "remainder" } as const;
		expect(withLegValue(leg, 999)).toBe(leg);
	});
});

describe("mappingTargets", () => {
	it("returns one target for a plain mapping", () => {
		expect(mappingTargets("pl-1")).toEqual(["pl-1"]);
	});

	it("returns every leg's plId for a split mapping", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 60 },
				{ plId: "pl-trad", mode: "remainder" },
			],
		};
		expect(mappingTargets(m)).toEqual(["pl-roth", "pl-trad"]);
	});

	it("returns empty for undefined", () => {
		expect(mappingTargets(undefined)).toEqual([]);
	});

	it("excludes IGNORE_PL_ID legs from the target list", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 60 },
				{ plId: IGNORE_PL_ID, mode: "percent", value: 40 },
			],
		};
		expect(mappingTargets(m)).toEqual(["pl-roth"]);
	});
});

describe("isSplitValid", () => {
	it("treats plain string mappings as always valid", () => {
		expect(isSplitValid(1000, "pl-1")).toBe(true);
	});

	it("rejects splits with zero legs", () => {
		expect(isSplitValid(1000, { splits: [] })).toBe(false);
	});

	it("rejects splits with any leg missing a plId", () => {
		expect(
			isSplitValid(1000, {
				splits: [
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "", mode: "percent", value: 40 },
				],
			}),
		).toBe(false);
	});

	it("accepts percent-only splits that sum to 100", () => {
		expect(
			isSplitValid(10_000, {
				splits: [
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "percent", value: 40 },
				],
			}),
		).toBe(true);
	});

	it("rejects percent-only splits that don't sum to 100 (no remainder)", () => {
		expect(
			isSplitValid(10_000, {
				splits: [
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "percent", value: 30 },
				],
			}),
		).toBe(false);
	});

	it("accepts fixed legs paired with a remainder leg that absorbs what's left", () => {
		expect(
			isSplitValid(10_000, {
				splits: [
					{ plId: "pl-trad", mode: "fixed", value: 7500 },
					{ plId: "pl-roth", mode: "remainder" },
				],
			}),
		).toBe(true);
	});

	it("rejects splits where fixed legs over-allocate (negative remainder)", () => {
		expect(
			isSplitValid(10_000, {
				splits: [
					{ plId: "pl-trad", mode: "fixed", value: 12_000 },
					{ plId: "pl-roth", mode: "remainder" },
				],
			}),
		).toBe(false);
	});

	it("rejects fixed-only splits where the sum doesn't match the balance", () => {
		expect(
			isSplitValid(10_000, {
				splits: [{ plId: "pl-trad", mode: "fixed", value: 9000 }],
			}),
		).toBe(false);
	});

	it("treats IGNORE_PL_ID legs as fully allocated for validation", () => {
		// 60% Roth + 40% ignored should validate just like 60/40 to two real PL accounts.
		expect(
			isSplitValid(10_000, {
				splits: [
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: IGNORE_PL_ID, mode: "percent", value: 40 },
				],
			}),
		).toBe(true);
	});

	it("rejects splits when balance is null", () => {
		expect(
			isSplitValid(null, {
				splits: [{ plId: "pl-roth", mode: "percent", value: 100 }],
			}),
		).toBe(false);
	});

	it("accepts a single remainder leg on a negative (liability) balance", () => {
		expect(
			isSplitValid(-2000, {
				splits: [{ plId: "pl-debt", mode: "remainder" }],
			}),
		).toBe(true);
	});

	it("accepts percent + remainder on a negative (liability) balance", () => {
		expect(
			isSplitValid(-2000, {
				splits: [
					{ plId: "pl-a", mode: "percent", value: 50 },
					{ plId: "pl-b", mode: "remainder" },
				],
			}),
		).toBe(true);
	});

	it("rejects a percent leg that overshoots a negative balance past the remainder", () => {
		expect(
			isSplitValid(-2000, {
				splits: [
					{ plId: "pl-a", mode: "percent", value: 150 },
					{ plId: "pl-b", mode: "remainder" },
				],
			}),
		).toBe(false);
	});
});

describe("expandToSyncCandidates", () => {
	it("returns one candidate for a plain mapping", () => {
		expect(expandToSyncCandidates(acc(1000), "pl-1")).toEqual([
			{ plId: "pl-1", balance: 1000, name: "401k" },
		]);
	});

	it("returns no candidates when balance is null", () => {
		expect(expandToSyncCandidates(acc(null), "pl-1")).toEqual([]);
	});

	it("returns no candidates when entry is undefined", () => {
		expect(expandToSyncCandidates(acc(1000), undefined)).toEqual([]);
	});

	it("splits by percent", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 60 },
				{ plId: "pl-trad", mode: "percent", value: 40 },
			],
		};
		expect(expandToSyncCandidates(acc(10_000), m)).toEqual([
			{ plId: "pl-roth", balance: 6000, name: "401k" },
			{ plId: "pl-trad", balance: 4000, name: "401k" },
		]);
	});

	it("treats fixed legs as absolute dollar amounts", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-trad", mode: "fixed", value: 7500 },
				{ plId: "pl-roth", mode: "remainder" },
			],
		};
		expect(expandToSyncCandidates(acc(10_000), m)).toEqual([
			{ plId: "pl-trad", balance: 7500, name: "401k" },
			{ plId: "pl-roth", balance: 2500, name: "401k" },
		]);
	});

	it("computes remainder as total minus fixed and percent legs", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-a", mode: "percent", value: 25 }, // 2500
				{ plId: "pl-b", mode: "fixed", value: 1500 },
				{ plId: "pl-c", mode: "remainder" }, // 6000
			],
		};
		const out = expandToSyncCandidates(acc(10_000), m);
		expect(out.map((c) => c.balance)).toEqual([2500, 1500, 6000]);
	});

	it("splits remainder equally across multiple remainder legs", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-a", mode: "fixed", value: 1000 },
				{ plId: "pl-b", mode: "remainder" },
				{ plId: "pl-c", mode: "remainder" },
			],
		};
		const out = expandToSyncCandidates(acc(5000), m);
		expect(out.map((c) => c.balance)).toEqual([1000, 2000, 2000]);
	});

	it("passes through a negative remainder when fixed/percent over-allocate", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-a", mode: "fixed", value: 12_000 },
				{ plId: "pl-b", mode: "remainder" },
			],
		};
		const out = expandToSyncCandidates(acc(10_000), m);
		expect(out.map((c) => c.balance)).toEqual([12_000, -2000]);
	});

	it("returns no candidates when split has zero legs", () => {
		expect(expandToSyncCandidates(acc(1000), { splits: [] })).toEqual([]);
	});

	it("drops legs targeting IGNORE_PL_ID from the candidate list", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 60 },
				{ plId: IGNORE_PL_ID, mode: "percent", value: 40 },
			],
		};
		expect(expandToSyncCandidates(acc(10_000), m)).toEqual([
			{ plId: "pl-roth", balance: 6000, name: "401k" },
		]);
	});

	it("drops a single mapping that points at IGNORE_PL_ID", () => {
		expect(expandToSyncCandidates(acc(1000), IGNORE_PL_ID)).toEqual([]);
	});

	it("drops split legs whose plId is empty (defensive against unfinished edits)", () => {
		const m: SplitMapping = {
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 60 },
				{ plId: "", mode: "percent", value: 40 },
			],
		};
		expect(expandToSyncCandidates(acc(10_000), m)).toEqual([
			{ plId: "pl-roth", balance: 6000, name: "401k" },
		]);
	});
});
