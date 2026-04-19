export type Account = {
  name: string;
  balance: number;
  accountId: string | null;
};

export type PlAccount = { id: string; name: string };

export type SyncResult = { name: string; ok: boolean; error?: string };

export type PlSyncState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "done"; results: SyncResult[] }
  | { status: "error"; message: string };
