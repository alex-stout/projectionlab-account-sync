import type { Account, PlAccount } from "~/types";
import { fmt } from "../utils";

type Props = {
	accountKey: string;
	account: Account;
	mapped: string;
	plAccounts: PlAccount[];
	otherSources?: string[];
	onChange: (key: string, plId: string) => void;
};

export default function AccountRow({
	accountKey,
	account,
	mapped,
	plAccounts,
	otherSources,
	onChange,
}: Props) {
	const showOverlapHint = mapped && otherSources && otherSources.length > 0;
	return (
		<div className="grid grid-cols-[1fr_auto_152px] gap-2 items-center py-2">
			<div className="min-w-0">
				<div className="truncate font-medium text-gray-800 text-xs">
					{account.name}
				</div>
				<div className="text-gray-400 text-[11px]">{fmt(account.balance)}</div>
			</div>
			<span className="text-gray-300 text-xs">→</span>
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
