import type { PlSyncState } from "~/types";

type Props = {
  mappedCount: number;
  totalCount: number;
  plAccountsLoaded: boolean;
  plSync: PlSyncState;
  onSync: () => void;
};

export default function SyncFooter({
  mappedCount,
  totalCount,
  plAccountsLoaded,
  plSync,
  onSync,
}: Props) {
  const canSync = mappedCount > 0 && plSync.status !== "syncing";

  return (
    <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          {mappedCount} of {totalCount} mapped
        </span>
        {!plAccountsLoaded && (
          <span className="text-[11px] text-amber-500">
            Load PL accounts in Settings
          </span>
        )}
      </div>
      <button
        onClick={onSync}
        disabled={!canSync}
        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-lg font-semibold disabled:opacity-35 transition-colors text-sm"
      >
        {plSync.status === "syncing" ? "Syncing…" : "Sync to ProjectionLab"}
      </button>
      {plSync.status === "error" && (
        <div className="text-[11px] text-red-600 bg-red-50 rounded-md px-3 py-2">
          {plSync.message}
        </div>
      )}
      {plSync.status === "done" && (
        <div className="space-y-1">
          {plSync.results.map((r, i) =>
            r.ok ? (
              <div
                key={i}
                className="text-[11px] text-green-700 flex items-center gap-1.5"
              >
                <span className="text-green-500">✓</span> {r.name}
              </div>
            ) : (
              <div
                key={i}
                className="text-[11px] text-red-600 flex items-center gap-1.5"
              >
                <span>✗</span> {r.name}: {r.error}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
