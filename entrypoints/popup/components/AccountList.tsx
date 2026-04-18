import type { SourcePlugin } from "~/plugins";
import type { Account, PlAccount } from "../types";
import { accountKey } from "../utils";
import AccountRow from "./AccountRow";

type Props = {
  plugin: SourcePlugin;
  accounts: Account[];
  mappings: Record<string, string>;
  plAccounts: PlAccount[];
  sourceError: string | null;
  onMappingChange: (key: string, plId: string) => void;
};

export default function AccountList({ plugin, accounts, mappings, plAccounts, sourceError, onMappingChange }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {sourceError && (
        <p className="text-[11px] text-red-500 mb-3">{sourceError}</p>
      )}

      {accounts.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-xs leading-relaxed">
          <img src={plugin.icon} alt={plugin.name} className="w-8 h-8 object-contain mx-auto mb-2 opacity-40" />
          {plugin.hint ?? <>Open {plugin.name} and click <strong className="text-gray-600">↻ {plugin.name}</strong>.</>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_152px] gap-2 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            <span>{plugin.name} account</span>
            <span />
            <span>ProjectionLab</span>
          </div>
          <div className="divide-y divide-gray-100">
            {accounts.map((acc, i) => {
              const key = accountKey(acc, i);
              return (
                <AccountRow
                  key={key}
                  accountKey={key}
                  account={acc}
                  mapped={mappings[key] ?? ""}
                  plAccounts={plAccounts}
                  onChange={onMappingChange}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
