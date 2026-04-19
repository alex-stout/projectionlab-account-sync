import vanguard from "./vanguard";
import alight from "./alight";

export type SourcePlugin = {
  id: string;
  name: string;
  icon: string;
  urlPatterns: string[];
  hint?: string; // shown in empty state
};

export const PLUGINS: SourcePlugin[] = [vanguard, alight];

export const accountsKey = (sourceId: string) => `accounts_${sourceId}`;
export const mappingsKey = (sourceId: string) => `mappings_${sourceId}`;
export const lastSyncedKey = (sourceId: string) => `lastSynced_${sourceId}`;
export const lastRefreshedKey = (sourceId: string) => `lastRefreshed_${sourceId}`;
export const plApiKey = "plApiKey";
