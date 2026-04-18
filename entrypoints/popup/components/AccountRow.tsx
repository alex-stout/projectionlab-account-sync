import type { Account, PlAccount } from "../types";
import { fmt } from "../utils";

type Props = {
  accountKey: string;
  account: Account;
  mapped: string;
  plAccounts: PlAccount[];
  onChange: (key: string, plId: string) => void;
};

export default function AccountRow({ accountKey, account, mapped, plAccounts, onChange }: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto_152px] gap-2 items-center py-2">
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-800 text-xs">{account.name}</div>
        <div className="text-gray-400 text-[11px]">{fmt(account.balance)}</div>
      </div>
      <span className="text-gray-300 text-xs">→</span>
      <select
        value={mapped}
        onChange={(e) => onChange(accountKey, e.target.value)}
        disabled={plAccounts.length === 0}
        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
      >
        <option value="">
          {plAccounts.length === 0 ? "↻ Load PL accounts" : "Not mapped"}
        </option>
        {plAccounts.map((pla) => (
          <option key={pla.id} value={pla.id}>
            {pla.name}
          </option>
        ))}
      </select>
    </div>
  );
}
