import type { SourcePlugin } from "~/plugins";
import { timeAgo } from "../utils";

type Props = {
  plugins: SourcePlugin[];
  activeId: string;
  lastSynced: Record<string, number>;
  available: Record<string, boolean>;
  onSelect: (id: string) => void;
};

export default function Sidebar({ plugins, activeId, lastSynced, available, onSelect }: Props) {
  return (
    <div className="flex flex-col w-[72px] bg-slate-900 shrink-0">
      <div className="h-[46px] flex items-center justify-center border-b border-slate-700">
        <span className="text-white text-xs font-bold tracking-tight">PL</span>
      </div>

      <div className="flex flex-col gap-1 p-2 flex-1">
        {plugins.map((plugin) => {
          const isActive = plugin.id === activeId;
          const isAvailable = available[plugin.id] ?? false;
          const ts = lastSynced[plugin.id] ?? null;
          return (
            <button
              key={plugin.id}
              onClick={() => onSelect(plugin.id)}
              title={plugin.name}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg w-full transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <img src={plugin.icon} alt={plugin.name} className="w-6 h-6 object-contain" />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center">
                {plugin.name}
              </span>
              {ts && (
                <span className={`text-[8px] leading-none ${isActive ? "text-indigo-200" : "text-slate-500"}`}>
                  {timeAgo(ts)}
                </span>
              )}
              {isAvailable && (
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isActive ? "bg-indigo-200" : "bg-green-400"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
