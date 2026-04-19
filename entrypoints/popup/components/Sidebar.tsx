import type { SourcePlugin } from "~/plugins";
import { timeAgo } from "../utils";

type Props = {
  plugins: SourcePlugin[];
  activeId: string;
  lastSynced: Record<string, number>;
  available: Record<string, boolean>;
  settingsActive: boolean;
  hasApiKey: boolean;
  onSelect: (id: string) => void;
  onSettings: () => void;
};

export default function Sidebar({
  plugins,
  activeId,
  lastSynced,
  available,
  settingsActive,
  hasApiKey,
  onSelect,
  onSettings,
}: Props) {
  return (
    <div className="flex flex-col w-18 bg-slate-900 shrink-0">
      <div className="h-11.5 flex items-center justify-center border-b border-slate-700">
        <span className="text-white text-xs font-bold tracking-tight">PL</span>
      </div>

      <div className="flex flex-col gap-1 p-2 flex-1">
        {plugins.map((plugin) => {
          const isActive = !settingsActive && plugin.id === activeId;
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
              <img
                src={plugin.icon}
                alt={plugin.name}
                className="w-6 h-6 object-contain"
              />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center">
                {plugin.name}
              </span>
              {ts && (
                <span
                  className={`text-[8px] leading-none ${isActive ? "text-indigo-200" : "text-slate-500"}`}
                >
                  {timeAgo(ts)}
                </span>
              )}
              {isAvailable && (
                <span
                  className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isActive ? "bg-indigo-200" : "bg-green-400"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={onSettings}
          title="Settings"
          className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg w-full transition-colors ${
            settingsActive
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-[9px] font-medium leading-none">Settings</span>
          {!hasApiKey && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>
      </div>
    </div>
  );
}
