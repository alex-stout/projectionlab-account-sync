import { useEffect, useState } from "react";
import {
  PLUGINS,
  lastSyncedKey,
  lastRefreshedKey,
  credsKey,
  plApiKey,
  plLastRefreshedKey,
  disabledPluginsKey,
} from "~/plugins";
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
  const [plLastRefreshed, setPlLastRefreshed] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<Record<string, number>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Record<string, number>>(
    {},
  );
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [disabledPlugins, setDisabledPlugins] = useState<string[]>([]);

  useEffect(() => {
    const keys = [
      "plAccounts",
      plApiKey,
      plLastRefreshedKey,
      disabledPluginsKey,
      ...PLUGINS.map((p) => lastSyncedKey(p.id)),
      ...PLUGINS.map((p) => lastRefreshedKey(p.id)),
    ];
    browser.storage.local.get(keys).then((storage) => {
      setHasApiKey(!!storage[plApiKey]);
      setPlAccounts((storage.plAccounts as PlAccount[]) ?? []);
      setPlLastRefreshed((storage[plLastRefreshedKey] as number) ?? null);
      setDisabledPlugins((storage[disabledPluginsKey] as string[]) ?? []);
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
        if (p.kind === "api") {
          const stored = await browser.storage.local.get(credsKey(p.id));
          const creds =
            (stored[credsKey(p.id)] as Record<string, string>) ?? {};
          const hasAll = p.credentials.every((f) => !!creds[f.key]?.trim());
          return [p.id, hasAll] as const;
        }
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
      const ts = Date.now();
      setPlAccounts(response.accounts);
      setPlLastRefreshed(ts);
      await browser.storage.local.set({
        plAccounts: response.accounts,
        [plLastRefreshedKey]: ts,
      });
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

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    const next = enabled
      ? disabledPlugins.filter((id) => id !== pluginId)
      : [...disabledPlugins, pluginId];
    setDisabledPlugins(next);
    await browser.storage.local.set({ [disabledPluginsKey]: next });
  };

  const enabledPlugins = PLUGINS.filter((p) => !disabledPlugins.includes(p.id));
  const activePlugin =
    enabledPlugins.find((p) => p.id === activeId) ?? enabledPlugins[0];
  const forceSettings = !activePlugin;
  const showSettings = view === "settings" || forceSettings;

  return (
    <div className="flex w-full h-full min-w-115 bg-white text-sm text-gray-900 overflow-hidden">
      <Sidebar
        plugins={enabledPlugins}
        activeId={activePlugin?.id ?? ""}
        lastSynced={lastSynced}
        available={available}
        settingsActive={showSettings}
        hasApiKey={hasApiKey}
        onSelect={(id) => {
          setActiveId(id);
          setView("main");
        }}
        onSettings={() => setView(view === "settings" ? "main" : "settings")}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {showSettings ? (
          <SettingsPanel
            onKeyChange={setHasApiKey}
            onCredsChange={(pluginId, hasAllCreds) =>
              setAvailable((prev) => ({ ...prev, [pluginId]: hasAllCreds }))
            }
            onDataCleared={() => {
              setPlAccounts([]);
              setLastSynced({});
              setLastRefreshed({});
              setPlLastRefreshed(null);
              setDisabledPlugins([]);
            }}
            plAccounts={plAccounts}
            plLoading={plLoading}
            plError={plError}
            plLastRefreshed={plLastRefreshed}
            onRefreshPL={handleRefreshPL}
            disabledPlugins={disabledPlugins}
            onTogglePlugin={handleTogglePlugin}
          />
        ) : (
          <>
            <div className="h-11.5 flex items-center px-4 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-gray-800 text-sm">
                {activePlugin!.name}
              </span>
              <span className="mx-2 text-gray-300">→</span>
              <span className="font-semibold text-gray-800 text-sm">
                ProjectionLab
              </span>
            </div>

            <SourcePanel
              key={activePlugin!.id}
              plugin={activePlugin!}
              plAccounts={plAccounts}
              lastRefreshed={lastRefreshed[activePlugin!.id] ?? null}
              onSynced={() => handleSynced(activePlugin!.id)}
              onRefreshed={() => handleRefreshed(activePlugin!.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
