import type { SyncResult } from "~/entrypoints/popup/types";

type SyncEntry = { plId: string; balance: number; name: string };
type PlApiAccount = { id: string; name: string };
type PlExportData = {
  today?: {
    savingsAccounts?: PlApiAccount[];
    investmentAccounts?: PlApiAccount[];
    assets?: PlApiAccount[];
    debts?: PlApiAccount[];
  };
};

// Unlisted script — injected into the MAIN world of ProjectionLab tabs.
// Has access to window.projectionlabPluginAPI. No browser extension APIs available.
export default defineUnlistedScript(() => {
  console.log("[PL-ext main] MAIN world script loaded");
  console.log(
    "[PL-ext main] projectionlabPluginAPI:",
    (window as any).projectionlabPluginAPI,
  );

  async function handleFetchAccounts(id: string, apiKey: string) {
    console.log("[PL-ext main] handleFetchAccounts", { id, apiKeyLen: apiKey?.length });
    const api = (window as any).projectionlabPluginAPI;
    if (!api) {
      console.warn("[PL-ext main] Plugin API not found on window");
      dispatch(id, {
        error: "ProjectionLab Plugin API not found. Enable plugins in Account Settings.",
      });
      return;
    }

    console.log("[PL-ext main] calling exportData...");
    const result = await (api.exportData({ key: apiKey }) as Promise<PlExportData>)
      .then((data) => {
        console.log("[PL-ext main] exportData resolved:", data);
        console.log("[PL-ext main] data.today keys:", data?.today ? Object.keys(data.today) : "no today key");
        const accounts = [
          ...(data?.today?.savingsAccounts ?? []),
          ...(data?.today?.investmentAccounts ?? []),
          ...(data?.today?.assets ?? []),
          ...(data?.today?.debts ?? []),
        ].map((a) => ({ id: a.id, name: a.name }));
        console.log("[PL-ext main] mapped accounts:", accounts);
        return { accounts };
      })
      .catch((e: unknown) => {
        console.error("[PL-ext main] exportData threw:", e);
        return { error: "exportData failed: " + (e instanceof Error ? e.message : String(e)) };
      });

    dispatch(id, result);
  }

  async function handleSyncEntries(id: string, entries: SyncEntry[], apiKey: string) {
    console.log("[PL-ext main] handleSyncEntries", { id, entries });
    const api = (window as any).projectionlabPluginAPI;
    if (!api) {
      dispatch(id, { error: "ProjectionLab Plugin API not found." });
      return;
    }

    const results: SyncResult[] = [];
    await Promise.all(
      entries.map((entry) =>
        (api.updateAccount(entry.plId, { balance: entry.balance }, { key: apiKey }) as Promise<void>)
          .then(() => {
            console.log("[PL-ext main] updateAccount ok:", entry.name);
            results.push({ name: entry.name, ok: true });
          })
          .catch((e: unknown) => {
            console.error("[PL-ext main] updateAccount failed:", entry.name, e);
            results.push({ name: entry.name, ok: false, error: e instanceof Error ? e.message : String(e) });
          }),
      ),
    );

    dispatch(id, { results });
  }

  function dispatch(id: string, detail: unknown) {
    window.dispatchEvent(new CustomEvent(`pl-ext-result-${id}`, { detail }));
  }

  window.addEventListener("pl-ext-fetch-accounts", (e: Event) => {
    const { id, apiKey } = (e as CustomEvent<{ id: string; apiKey: string }>).detail;
    handleFetchAccounts(id, apiKey);
  });

  window.addEventListener("pl-ext-sync-entries", (e: Event) => {
    const { id, entries, apiKey } = (e as CustomEvent<{ id: string; entries: SyncEntry[]; apiKey: string }>).detail;
    handleSyncEntries(id, entries, apiKey);
  });

  console.log("[PL-ext main] listeners registered");
});
