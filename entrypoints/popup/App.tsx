import { useEffect, useState } from "react";
import { PLUGINS, lastSyncedKey, lastRefreshedKey } from "~/plugins";
import SourcePanel from "./SourcePanel";
import Sidebar from "./components/Sidebar";
import type { PlAccount } from "./types";

export default function Popup() {
  const [activeId, setActiveId] = useState(PLUGINS[0].id);
  const [plAccounts, setPlAccounts] = useState<PlAccount[]>([]);
  const [plLoading, setPlLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Record<string, number>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Record<string, number>>(
    {},
  );
  const [available, setAvailable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const keys = [
      "plAccounts",
      ...PLUGINS.map((p) => lastSyncedKey(p.id)),
      ...PLUGINS.map((p) => lastRefreshedKey(p.id)),
    ];
    browser.storage.local.get(keys).then((storage) => {
      setPlAccounts((storage.plAccounts as PlAccount[]) ?? []);
      const synced: Record<string, number> = {};
      const refreshed: Record<string, number> = {};
      for (const p of PLUGINS) {
        if (storage[lastSyncedKey(p.id)])
          synced[p.id] = storage[lastSyncedKey(p.id)] as number;
        if (storage[lastRefreshedKey(p.id)])
          refreshed[p.id] = storage[lastRefreshedKey(p.id)] as number;
      }
      setLastSynced(synced);
      setLastRefreshed(refreshed);
    });

    Promise.all(
      PLUGINS.map(async (p) => {
        const tabs = await Promise.all(
          p.urlPatterns.map((url) => browser.tabs.query({ url })),
        );
        return [p.id, tabs.flat().length > 0] as const;
      }),
    ).then((entries) => setAvailable(Object.fromEntries(entries)));
  }, []);

  const handleRefreshPL = async () => {
    setPlLoading(true);
    const response = (await browser.runtime.sendMessage({
      type: "FETCH_PL_ACCOUNTS",
    })) as { accounts?: PlAccount[]; error?: string };
    if (response?.accounts) {
      setPlAccounts(response.accounts);
      await browser.storage.local.set({ plAccounts: response.accounts });
    }
    setPlLoading(false);
  };

  const handleSynced = (sourceId: string) => {
    setLastSynced((prev) => ({ ...prev, [sourceId]: Date.now() }));
  };

  const handleRefreshed = (sourceId: string) => {
    setLastRefreshed((prev) => ({ ...prev, [sourceId]: Date.now() }));
  };

  const activePlugin = PLUGINS.find((p) => p.id === activeId)!;

  return (
    <div className="flex w-115 h-120 bg-white text-sm text-gray-900 overflow-hidden">
      <Sidebar
        plugins={PLUGINS}
        activeId={activeId}
        lastSynced={lastSynced}
        available={available}
        onSelect={setActiveId}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="h-[46px] flex items-center px-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800 text-sm">
            {activePlugin.name}
          </span>
          <span className="mx-2 text-gray-300">→</span>
          <span className="font-semibold text-gray-800 text-sm">
            ProjectionLab
          </span>
        </div>

        <SourcePanel
          key={activeId}
          plugin={activePlugin}
          plAccounts={plAccounts}
          plLoading={plLoading}
          lastRefreshed={lastRefreshed[activeId] ?? null}
          onRefreshPL={handleRefreshPL}
          onSynced={() => handleSynced(activeId)}
          onRefreshed={() => handleRefreshed(activeId)}
        />
      </div>
    </div>
  );
}
