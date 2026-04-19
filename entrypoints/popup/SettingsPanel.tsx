import { useEffect, useState } from "react";
import { PLUGINS, plApiKey, accountsKey, mappingsKey, lastSyncedKey, lastRefreshedKey } from "~/plugins";

type Props = {
  onKeyChange: (hasKey: boolean) => void;
  onDataCleared?: () => void;
};

export default function SettingsPanel({ onKeyChange, onDataCleared }: Props) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    browser.storage.local.get(plApiKey).then((s) => {
      if (s[plApiKey]) setKey(s[plApiKey] as string);
    });
  }, []);

  const handleSave = async () => {
    const trimmed = key.trim();
    await browser.storage.local.set({ [plApiKey]: trimmed });
    onKeyChange(!!trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    await browser.storage.local.remove(plApiKey);
    setKey("");
    onKeyChange(false);
  };

  const handleClearData = async () => {
    const keys = [
      "plAccounts",
      ...PLUGINS.flatMap((p) => [
        accountsKey(p.id),
        mappingsKey(p.id),
        lastSyncedKey(p.id),
        lastRefreshedKey(p.id),
      ]),
    ];
    await browser.storage.local.remove(keys);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
    onDataCleared?.();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-800 mb-5">Settings</h2>

      <label className="text-xs font-medium text-gray-600 mb-1.5">
        ProjectionLab API Key
      </label>
      <input
        type="password"
        value={key}
        onChange={(e) => { setKey(e.target.value); setSaved(false); }}
        placeholder="Paste your API key…"
        className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
      />
      <p className="text-[11px] text-gray-400 mt-1.5 mb-4">
        Find it in ProjectionLab → Settings → Plugins
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-35 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
        {key && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-medium text-gray-600 mb-1">Sync Data</p>
        <p className="text-[11px] text-gray-400 mb-3">
          Removes all cached accounts, mappings, and sync history.
        </p>
        <button
          onClick={handleClearData}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          {cleared ? "✓ Cleared" : "Clear All Data"}
        </button>
      </div>
    </div>
  );
}
