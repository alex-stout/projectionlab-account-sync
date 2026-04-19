import { timeAgo } from "../utils";

type Props = {
  pluginName: string;
  loading: boolean;
  lastRefreshed: number | null;
  onRefreshSource: () => void;
};

export default function PanelHeader({ pluginName, loading, lastRefreshed, onRefreshSource }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Account Mappings
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefreshSource}
          disabled={loading}
          className="text-[11px] text-indigo-500 hover:text-indigo-700 disabled:opacity-40 font-medium"
        >
          {loading ? "Loading…" : `↻ ${pluginName}`}
        </button>
        {lastRefreshed && (
          <span className="text-[10px] text-gray-400">{timeAgo(lastRefreshed)}</span>
        )}
      </div>
    </div>
  );
}
