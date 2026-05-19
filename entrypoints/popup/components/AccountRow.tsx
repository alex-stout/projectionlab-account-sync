import { isSplitMapping } from "~/lib/mapping";
import type { Account, PlAccount, SplitMapping } from "~/types";
import { fmt } from "../utils";
import SplitEditor from "./SplitEditor";

type Props = {
	accountKey: string;
	account: Account;
	mapping?: string | SplitMapping;
	mapped: string;
	plAccounts: PlAccount[];
	otherSources?: string[];
	onChange: (key: string, entry: string | SplitMapping) => void;
};

export default function AccountRow({
	accountKey,
	account,
	mapping,
	mapped,
	plAccounts,
	otherSources,
	onChange,
}: Props) {
	const isSplit = isSplitMapping(mapping);
	const showOverlapHint =
		!isSplit && mapped && otherSources && otherSources.length > 0;

	const startSplit = () => {
		const seedLeg: SplitMapping["splits"][number] = mapped
			? { plId: mapped, mode: "percent", value: 100 }
			: { plId: "", mode: "percent", value: 100 };
		onChange(accountKey, { splits: [seedLeg] });
	};

	const endSplit = () => {
		// Cancelling a split clears the mapping back to "Not mapped".
		onChange(accountKey, "");
	};

	if (isSplit) {
		return (
			<div className="py-2.5 space-y-2">
				<div className="flex items-baseline justify-between gap-2">
					<div className="min-w-0">
						<div className="truncate font-medium text-gray-800 text-xs">
							{account.name}
						</div>
						<div className="text-gray-400 text-[11px]">
							{fmt(account.balance)}
						</div>
					</div>
					<span className="text-[10px] text-indigo-600 font-medium uppercase tracking-wide shrink-0">
						Split
					</span>
				</div>
				<SplitEditor
					account={account}
					mapping={mapping}
					plAccounts={plAccounts}
					onChange={(next) => onChange(accountKey, next)}
					onCancel={endSplit}
				/>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-[1fr_auto_152px] gap-2 items-start py-2">
			<div className="min-w-0">
				<div className="truncate font-medium text-gray-800 text-xs">
					{account.name}
				</div>
				<div className="text-gray-400 text-[11px]">{fmt(account.balance)}</div>
			</div>
			<span className="text-gray-300 text-xs pt-1">→</span>
			<div className="min-w-0">
				<select
					value={mapped}
					onChange={(e) => onChange(accountKey, e.target.value)}
					disabled={plAccounts.length === 0}
					className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
				>
					<option value="">
						{plAccounts.length === 0 ? "Load in Settings" : "Not mapped"}
					</option>
					{plAccounts.map((pla) => (
						<option key={pla.id} value={pla.id}>
							{pla.name}
						</option>
					))}
				</select>
				{plAccounts.length > 0 && (
					<button
						type="button"
						onClick={startSplit}
						className="text-[10px] text-indigo-600 hover:text-indigo-700 mt-1 leading-tight"
					>
						Split into multiple
					</button>
				)}
				{showOverlapHint && (
					<div
						className="text-[10px] text-amber-600 mt-1 leading-tight"
						title="Stored balances from these sources will be summed in at sync time. Refresh them first to avoid stale data."
					>
						+ also from {otherSources.join(", ")}
					</div>
				)}
			</div>
		</div>
	);
}
