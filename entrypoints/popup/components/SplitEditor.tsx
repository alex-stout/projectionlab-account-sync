import { useEffect, useState } from "react";
import {
	IGNORE_PL_ID,
	isIgnoreTarget,
	SPLIT_DOLLAR_TOLERANCE,
	SPLIT_PERCENT_TOLERANCE,
	summarizeSplit,
	withLegPlId,
	withLegValue,
} from "~/lib/mapping";
import type { Account, PlAccount, SplitLeg, SplitMapping } from "~/types";
import { fmt } from "../utils";

type Props = {
	account: Account;
	mapping: SplitMapping;
	plAccounts: PlAccount[];
	onChange: (next: SplitMapping) => void;
	onCancel: () => void;
};

const MODES: { value: SplitLeg["mode"]; label: string }[] = [
	{ value: "percent", label: "%" },
	{ value: "fixed", label: "$" },
	{ value: "remainder", label: "rest" },
];

function setLegMode(leg: SplitLeg, mode: SplitLeg["mode"]): SplitLeg {
	if (mode === "remainder") return { plId: leg.plId, mode: "remainder" };
	const value = leg.mode === "remainder" ? 0 : leg.value;
	return { plId: leg.plId, mode, value };
}

/**
 * Number input that keeps a local string draft while the user is editing.
 * Without this, `parseFloat(e.target.value) || 0` snaps the displayed value
 * back to `0` when the user clears the field, types a leading `-`, or leaves
 * a trailing decimal (e.g. `"60."`). The committed numeric value still flows
 * up live on each parsable change, so the editor's status pill stays
 * responsive.
 */
function LegValueInput({
	value,
	step,
	roundToTenths,
	ariaLabel,
	onChange,
}: {
	value: number;
	step: number;
	roundToTenths: boolean;
	ariaLabel: string;
	onChange: (next: number) => void;
}) {
	const [focused, setFocused] = useState(false);
	const [draft, setDraft] = useState<string>(() => String(value));

	// Sync from the canonical numeric value when the user isn't actively
	// editing. Avoids stomping mid-edit while still picking up programmatic
	// changes (e.g. a mode toggle that resets value to 0).
	useEffect(() => {
		if (!focused) setDraft(String(value));
	}, [value, focused]);

	const normalize = (raw: number): number =>
		roundToTenths ? Math.round(raw * 10) / 10 : raw;

	return (
		<input
			aria-label={ariaLabel}
			type="number"
			inputMode="decimal"
			value={draft}
			step={step}
			min={0}
			onFocus={() => setFocused(true)}
			onBlur={() => {
				setFocused(false);
				const parsed = Number.parseFloat(draft);
				const next = Number.isFinite(parsed) ? normalize(parsed) : 0;
				onChange(next);
				setDraft(String(next));
			}}
			onChange={(e) => {
				setDraft(e.target.value);
				const parsed = Number.parseFloat(e.target.value);
				// Commit live whenever the draft parses cleanly so the leg's
				// "= $X" preview and the status pill update as the user types.
				// Drafts like "-", "" or "60." don't commit, leaving the
				// previous numeric value in place.
				if (Number.isFinite(parsed)) onChange(normalize(parsed));
			}}
			className="w-20 text-right text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
		/>
	);
}

export default function SplitEditor({
	account,
	mapping,
	plAccounts,
	onChange,
	onCancel,
}: Props) {
	const total = account.balance;
	const {
		percentTotal,
		remainderCount,
		remainderShare,
		allocated,
		unallocated,
	} = summarizeSplit(total, mapping.splits);

	const updateLeg = (i: number, leg: SplitLeg) => {
		const next = [...mapping.splits];
		next[i] = leg;
		onChange({ splits: next });
	};

	const removeLeg = (i: number) =>
		onChange({ splits: mapping.splits.filter((_, j) => j !== i) });

	const addLeg = () =>
		onChange({
			splits: [...mapping.splits, { plId: "", mode: "percent", value: 0 }],
		});

	const legAmount = (leg: SplitLeg): number => {
		if (leg.mode === "fixed") return leg.value;
		if (leg.mode === "percent") return (total * leg.value) / 100;
		return remainderShare;
	};

	const percentInvalid =
		mapping.splits.some((l) => l.mode === "percent") &&
		remainderCount === 0 &&
		Math.abs(percentTotal - 100) > SPLIT_PERCENT_TOLERANCE;
	const overAllocated =
		remainderCount === 0 && unallocated < -SPLIT_DOLLAR_TOLERANCE;
	const underAllocated =
		remainderCount === 0 && unallocated > SPLIT_DOLLAR_TOLERANCE;

	return (
		<div className="border border-indigo-100 bg-indigo-50/40 rounded-md">
			<ul className="divide-y divide-indigo-100">
				{mapping.splits.map((leg, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: split legs have no stable id; positional reordering not supported
					<li key={i} className="px-2.5 py-2 space-y-1.5">
						<div className="flex items-center gap-2">
							<select
								aria-label={`Split leg ${i + 1} PL account`}
								value={leg.plId}
								onChange={(e) => updateLeg(i, withLegPlId(leg, e.target.value))}
								className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
							>
								<option value="">Pick PL account…</option>
								<option value={IGNORE_PL_ID}>
									— Don't sync this portion —
								</option>
								{plAccounts.map((pla) => (
									<option key={pla.id} value={pla.id}>
										{pla.name}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => removeLeg(i)}
								aria-label={`Remove split leg ${i + 1}`}
								className="text-gray-400 hover:text-red-500 text-base leading-none px-1"
							>
								×
							</button>
						</div>

						<div className="flex items-center justify-between gap-2">
							<fieldset className="inline-flex rounded-md border border-gray-200 overflow-hidden bg-white p-0 m-0">
								<legend className="sr-only">{`Split leg ${i + 1} mode`}</legend>
								{MODES.map((m) => {
									const active = leg.mode === m.value;
									return (
										<button
											type="button"
											key={m.value}
											onClick={() => updateLeg(i, setLegMode(leg, m.value))}
											aria-pressed={active}
											className={`px-2 py-1 text-[11px] font-medium transition-colors ${
												active
													? "bg-indigo-500 text-white"
													: "text-gray-600 hover:bg-gray-50"
											}`}
										>
											{m.label}
										</button>
									);
								})}
							</fieldset>

							{leg.mode !== "remainder" && (
								<div className="flex items-center gap-1">
									<LegValueInput
										ariaLabel={`Split leg ${i + 1} value`}
										value={leg.value}
										step={leg.mode === "percent" ? 1 : 100}
										roundToTenths={leg.mode === "percent"}
										onChange={(next) => updateLeg(i, withLegValue(leg, next))}
									/>
									<span className="text-[11px] text-gray-400 w-3">
										{leg.mode === "percent" ? "%" : "$"}
									</span>
								</div>
							)}

							<span className="text-[11px] tabular-nums shrink-0 ml-auto">
								<span className="text-gray-500">= {fmt(legAmount(leg))}</span>
								{isIgnoreTarget(leg.plId) && (
									<span className="text-gray-400 ml-1">(ignored)</span>
								)}
							</span>
						</div>
					</li>
				))}
			</ul>

			<div className="flex items-center justify-between px-2.5 py-1.5 border-t border-indigo-100 bg-white/60">
				<button
					type="button"
					onClick={addLeg}
					className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
				>
					+ Add target
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="text-[11px] text-gray-400 hover:text-gray-600"
				>
					Cancel split
				</button>
			</div>

			<div className="px-2.5 py-1.5 border-t border-indigo-100 text-[11px] tabular-nums leading-tight bg-white/60 rounded-b-md">
				{percentInvalid ? (
					<span className="text-amber-600">
						Percentages total {percentTotal.toFixed(1)}% — should be 100%
					</span>
				) : overAllocated ? (
					<span className="text-red-500">
						Over-allocated by {fmt(Math.abs(unallocated))}
					</span>
				) : underAllocated ? (
					<span className="text-amber-600">{fmt(unallocated)} unallocated</span>
				) : remainderCount > 1 ? (
					<span className="text-amber-600">
						{remainderCount} "rest" legs share the remainder equally
					</span>
				) : (
					<span className="text-gray-500">
						Total: {fmt(allocated)} of {fmt(total)}
					</span>
				)}
			</div>
		</div>
	);
}
