import { useEffect, useState } from "react";
import { PLUGINS, lastSyncedKey, lastRefreshedKey, plApiKey } from "~/plugins";
import SourcePanel from "./SourcePanel";
import SettingsPanel from "./SettingsPanel";
import Sidebar from "./components/Sidebar";
import type { PlAccount } from "~/types";

export default function Popup() {
  const [activeId, setActiveId] = useState(PLUGINS[0].id);
  const [view, setView] = useState<"main" | "settings">("main");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [plAccounts, setPlAccounts] = useState<PlAccount[]>([]);
  const [plLoading, setPlLoading] = useState(false);
  const [plError, setPlError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Record<string, number>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Record<string, number>>(
    {},
  );
  const [available, setAvailable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const keys = [
      "plAccounts",
      plApiKey,
      ...PLUGINS.map((p) => lastSyncedKey(p.id)),
      ...PLUGINS.map((p) => lastRefreshedKey(p.id)),
    ];
    browser.storage.local.get(keys).then((storage) => {
      setHasApiKey(!!storage[plApiKey]);
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
    setPlError(null);
    const response = (await browser.runtime.sendMessage({
      type: "FETCH_PL_ACCOUNTS",
    })) as { accounts?: PlAccount[]; error?: string };
    if (response?.accounts) {
      setPlAccounts(response.accounts);
      await browser.storage.local.set({ plAccounts: response.accounts });
    } else if (response?.error) {
      setPlError(response.error);
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
        settingsActive={view === "settings"}
        hasApiKey={hasApiKey}
        onSelect={(id) => {
          setActiveId(id);
          setView("main");
          setPlError(null);
        }}
        onSettings={() => setView(view === "settings" ? "main" : "settings")}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {view === "settings" ? (
          <SettingsPanel
            onKeyChange={setHasApiKey}
            onDataCleared={() => {
              setPlAccounts([]);
              setLastSynced({});
              setLastRefreshed({});
            }}
          />
        ) : (
          <>
            <div className="h-11.5 flex items-center px-4 border-b border-gray-100 shrink-0">
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
              plError={plError}
              lastRefreshed={lastRefreshed[activeId] ?? null}
              onRefreshPL={handleRefreshPL}
              onSynced={() => handleSynced(activeId)}
              onRefreshed={() => handleRefreshed(activeId)}
            />
          </>
        )}
      </div>
    </div>
  );
}
