import {
  PLUGINS,
  accountsKey,
  mappingsKey,
  lastSyncedKey,
  lastRefreshedKey,
  credsKey,
  plApiKey,
} from "~/plugins";
import { PL_MATCHES } from "~/lib/urls";
import { Account } from "~/types";

type SyncEntry = { plId: string; balance: number; name: string };

export async function getPlTab() {
  for (const url of PL_MATCHES) {
    const tabs = await browser.tabs.query({ url });
    if (tabs.length > 0) return tabs[0];
  }
  return null;
}

export async function getSourceTab(sourceId: string) {
  const plugin = PLUGINS.find((p) => p.id === sourceId);
  if (!plugin || plugin.kind !== "content") return null;
  for (const pattern of plugin.urlPatterns) {
    const tabs = await browser.tabs.query({ url: pattern });
    if (tabs.length > 0) return tabs[0];
  }
  return null;
}

async function getApiKey(): Promise<string> {
  const stored = await browser.storage.local.get(plApiKey);
  return (stored[plApiKey] as string) || "";
}

async function handleMessage(msg: any): Promise<any> {
  if (msg.type === "SYNC_SOURCE") {
    const plugin = PLUGINS.find((p) => p.id === msg.sourceId);
    if (!plugin) return { error: `Unknown plugin: ${msg.sourceId}` };

    let accounts: Account[];
    if (plugin.kind === "content") {
      let tab: Awaited<ReturnType<typeof getSourceTab>>;
      try {
        tab = await getSourceTab(msg.sourceId);
      } catch {
        tab = null;
      }
      if (!tab?.id) {
        return {
          error: `${plugin.name} is not open. Navigate to ${plugin.name} and try again.`,
        };
      }

      let tabResult: { ok: boolean; payload?: Account[]; error?: string } | null;
      try {
        tabResult = await browser.tabs.sendMessage(tab.id, {
          type: "SYNC_REQUEST",
        });
      } catch {
        tabResult = null;
      }

      if (!tabResult?.ok) {
        return {
          error:
            tabResult?.error ??
            `Failed to read data from ${plugin.name}. Try refreshing the page.`,
        };
      }
      accounts = tabResult.payload!;
    } else {
      const stored = await browser.storage.local.get(credsKey(plugin.id));
      const creds =
        (stored[credsKey(plugin.id)] as Record<string, string>) ?? {};
      const missing = plugin.credentials.filter((f) => !creds[f.key]?.trim());
      if (missing.length > 0) {
        return {
          error: `${plugin.name} credentials are not set. Open Settings to add them.`,
        };
      }
      try {
        accounts = await plugin.refresh(creds);
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : `Failed to fetch from ${plugin.name}.`,
        };
      }
    }

    await browser.storage.local.set({
      [accountsKey(msg.sourceId)]: accounts,
      [lastRefreshedKey(msg.sourceId)]: Date.now(),
    });

    return { ok: true, accounts };
  }

  if (msg.type === "FETCH_PL_ACCOUNTS") {
    const apiKey = await getApiKey();
    if (!apiKey)
      return {
        error:
          "No API key set. Open extension settings to add your ProjectionLab API key.",
      };
    const tab = await getPlTab();
    if (!tab?.id) {
      return { error: "ProjectionLab is not open. Open it and try again." };
    }
    return browser.tabs.sendMessage(tab.id, {
      type: "FETCH_PL_ACCOUNTS",
      apiKey,
    });
  }

  if (msg.type === "SYNC_TO_PL") {
    const apiKey = await getApiKey();
    if (!apiKey)
      return {
        error:
          "No API key set. Open extension settings to add your ProjectionLab API key.",
      };
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
      .map((acc) => {
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
      await browser.storage.local.set({
        [lastSyncedKey(sourceId)]: Date.now(),
      });
    }

    return result;
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: any) => handleMessage(msg));
});
