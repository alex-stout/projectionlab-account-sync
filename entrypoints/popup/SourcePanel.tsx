import { useEffect, useState } from "react";
import { accountsKey, mappingsKey, type SourcePlugin } from "~/plugins";
import type { Account, PlAccount, PlSyncState, SyncResult } from "~/types";
import { accountKey } from "./utils";
import PanelHeader from "./components/PanelHeader";
import AccountList from "./components/AccountList";
import SyncFooter from "./components/SyncFooter";

type Props = {
  plugin: SourcePlugin;
  plAccounts: PlAccount[];
  plLoading: boolean;
  plError: string | null;
  lastRefreshed: number | null;
  onRefreshPL: () => void;
  onSynced: () => void;
  onRefreshed: () => void;
};

export default function SourcePanel({
  plugin,
  plAccounts,
  plLoading,
  plError,
  lastRefreshed,
  onRefreshPL,
  onSynced,
  onRefreshed,
}: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [plSync, setPlSync] = useState<PlSyncState>({ status: "idle" });

  useEffect(() => {
    browser.storage.local
      .get([accountsKey(plugin.id), mappingsKey(plugin.id)])
      .then((storage) => {
        setAccounts((storage[accountsKey(plugin.id)] as Account[]) ?? []);
        setMappings(
          (storage[mappingsKey(plugin.id)] as Record<string, string>) ?? {},
        );
      });
    setPlSync({ status: "idle" });
    setSourceError(null);
  }, [plugin.id]);

  const handleRefreshSource = async () => {
    setSourceError(null);
    setLoading(true);
    let response: { ok?: boolean; accounts?: Account[]; error?: string };
    try {
      response = await browser.runtime.sendMessage({
        type: "SYNC_SOURCE",
        sourceId: plugin.id,
      });
    } catch (e) {
      setSourceError(
        e instanceof Error
          ? e.message
          : "Failed to communicate with background.",
      );
      setLoading(false);
      return;
    }
    if (!response || response?.error) {
      setSourceError(
        response?.error ??
          `${plugin.name} is not open. Navigate to ${plugin.name} and try again.`,
      );
      setLoading(false);
      return;
    }
    setAccounts(response.accounts ?? []);
    setLoading(false);
    onRefreshed();
  };

  const handleMappingChange = async (vKey: string, plId: string) => {
    const next = { ...mappings, [vKey]: plId };
    if (!plId) delete next[vKey];
    setMappings(next);
    await browser.storage.local.set({ [mappingsKey(plugin.id)]: next });
  };

  const handleSync = async () => {
    setPlSync({ status: "syncing" });
    const response = (await browser.runtime.sendMessage({
      type: "SYNC_TO_PL",
      sourceId: plugin.id,
    })) as { results?: SyncResult[]; error?: string };
    if (response?.error) {
      setPlSync({ status: "error", message: response.error });
    } else {
      setPlSync({ status: "done", results: response.results ?? [] });
      onSynced();
    }
  };

  const mappedCount = accounts.filter(
    (acc, i) => !!mappings[accountKey(acc, i)],
  ).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PanelHeader
        pluginName={plugin.name}
        loading={loading}
        lastRefreshed={lastRefreshed}
        plLoading={plLoading}
        onRefreshSource={handleRefreshSource}
        onRefreshPL={onRefreshPL}
      />

      {plError && (
        <div className="mx-4 mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {plError}
        </div>
      )}

      <AccountList
        plugin={plugin}
        accounts={accounts}
        mappings={mappings}
        plAccounts={plAccounts}
        sourceError={sourceError}
        onMappingChange={handleMappingChange}
      />

      {accounts.length > 0 && (
        <SyncFooter
          mappedCount={mappedCount}
          totalCount={accounts.length}
          plAccountsLoaded={plAccounts.length > 0}
          plSync={plSync}
          onSync={handleSync}
        />
      )}
    </div>
  );
}
