import { PLUGINS, accountsKey, mappingsKey, lastSyncedKey, lastRefreshedKey } from "~/plugins";

type Account = {
  name: string;
  balance: number;
  rateOfReturn: number | null;
  accountId: string | null;
};

type SyncEntry = { plId: string; balance: number; name: string };

const PL_URLS = [
  "https://app.projectionlab.com/*",
  "https://ea.projectionlab.com/*",
  "https://preview.projectionlab.com/*",
];

export async function getPlTab() {
  for (const url of PL_URLS) {
    const tabs = await browser.tabs.query({ url });
    console.log(`[PL-ext bg] tabs.query(${url}):`, tabs.length);
    if (tabs.length > 0) return tabs[0];
  }
  return null;
}

export async function getSourceTab(sourceId: string) {
  const plugin = PLUGINS.find((p) => p.id === sourceId);
  if (!plugin) return null;
  for (const pattern of plugin.urlPatterns) {
    const tabs = await browser.tabs.query({ url: pattern });
    if (tabs.length > 0) return tabs[0];
  }
  return null;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (msg) => {
    console.log("[PL-ext bg] message:", msg.type, msg.sourceId ?? "");
    const apiKey = import.meta.env.WXT_PROJECTIONLAB_API as string;

    if (msg.type === "SYNC_DATA") {
      console.log("[PL-ext bg] SYNC_DATA payload:", JSON.stringify(msg.payload));
      await browser.storage.local.set({
        [accountsKey(msg.sourceId)]: msg.payload,
        [lastRefreshedKey(msg.sourceId)]: Date.now(),
      });
      return { ok: true };
    }

    if (msg.type === "SYNC_SOURCE") {
      const plugin = PLUGINS.find((p) => p.id === msg.sourceId);
      if (!plugin) return { error: `Unknown plugin: ${msg.sourceId}` };

      const tab = await getSourceTab(msg.sourceId);
      if (!tab?.id) {
        return {
          error: `${plugin.name} is not open. Navigate to ${plugin.name} and try again.`,
        };
      }

      await browser.tabs.sendMessage(tab.id, { type: "SYNC_REQUEST" });
      return { ok: true };
    }

    if (msg.type === "FETCH_PL_ACCOUNTS") {
      const tab = await getPlTab();
      console.log("[PL-ext bg] FETCH_PL_ACCOUNTS tab:", tab?.id, tab?.url);
      if (!tab?.id) {
        return { error: "ProjectionLab is not open. Open it and try again." };
      }
      const result = await browser.tabs.sendMessage(tab.id, {
        type: "FETCH_PL_ACCOUNTS",
        apiKey,
      });
      console.log("[PL-ext bg] FETCH_PL_ACCOUNTS result:", result);
      return result;
    }

    if (msg.type === "SYNC_TO_PL") {
      const { sourceId } = msg;
      const tab = await getPlTab();
      if (!tab?.id) {
        return { error: "ProjectionLab is not open. Open it and try again." };
      }

      const storage = await browser.storage.local.get([
        accountsKey(sourceId),
        mappingsKey(sourceId),
      ]);
      const accounts = (storage[accountsKey(sourceId)] as Account[]) ?? [];
      const mappings =
        (storage[mappingsKey(sourceId)] as Record<string, string>) ?? {};

      const entries: SyncEntry[] = accounts
        .map((acc, i) => {
          const key = acc.accountId ?? acc.name;
          const plId = mappings[key];
          return plId && acc.balance !== null
            ? { plId, balance: acc.balance, name: acc.name }
            : null;
        })
        .filter((e): e is SyncEntry => e !== null);

      if (entries.length === 0) {
        return { error: "No mapped accounts with balances to sync." };
      }

      const result = await browser.tabs.sendMessage(tab.id, {
        type: "SYNC_ENTRIES",
        entries,
        apiKey,
      });

      if (result && !result.error) {
        await browser.storage.local.set({ [lastSyncedKey(sourceId)]: Date.now() });
      }

      return result;
    }
  });
});
