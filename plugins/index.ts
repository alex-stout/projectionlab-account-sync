import type { Account } from "~/types";
import vanguard from "./vanguard";
import alight from "./alight";
import ynab from "./ynab";

type BasePlugin = {
  id: string;
  name: string;
  icon: string;
  hint?: string;
};

export type ContentPlugin = BasePlugin & {
  kind: "content";
  urlPatterns: string[];
};

export type CredentialField = {
  key: string;
  label: string;
  type: "password" | "text";
  help?: string;
};

export type ApiPlugin = BasePlugin & {
  kind: "api";
  credentials: CredentialField[];
  refresh: (creds: Record<string, string>) => Promise<Account[]>;
};

export type SourcePlugin = ContentPlugin | ApiPlugin;

export const PLUGINS: SourcePlugin[] = [vanguard, alight, ynab];

export const accountsKey = (sourceId: string) => `accounts_${sourceId}`;
export const mappingsKey = (sourceId: string) => `mappings_${sourceId}`;
export const lastSyncedKey = (sourceId: string) => `lastSynced_${sourceId}`;
export const lastRefreshedKey = (sourceId: string) => `lastRefreshed_${sourceId}`;
export const credsKey = (sourceId: string) => `creds_${sourceId}`;
export const plApiKey = "plApiKey";
export const plLastRefreshedKey = "plLastRefreshed";
export const disabledPluginsKey = "disabledPlugins";
