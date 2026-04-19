import { useEffect, useState } from "react";
import {
  PLUGINS,
  plApiKey,
  accountsKey,
  mappingsKey,
  lastSyncedKey,
  lastRefreshedKey,
  credsKey,
  type ApiPlugin,
} from "~/plugins";

type Props = {
  onKeyChange: (hasKey: boolean) => void;
  onCredsChange?: (pluginId: string, hasAllCreds: boolean) => void;
  onDataCleared?: () => void;
};

const API_PLUGINS = PLUGINS.filter(
  (p): p is ApiPlugin => p.kind === "api",
);

export default function SettingsPanel({
  onKeyChange,
  onCredsChange,
  onDataCleared,
}: Props) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

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
      plApiKey,
      ...PLUGINS.flatMap((p) => [
        accountsKey(p.id),
        mappingsKey(p.id),
        lastSyncedKey(p.id),
        lastRefreshedKey(p.id),
      ]),
      ...API_PLUGINS.map((p) => credsKey(p.id)),
    ];
    await browser.storage.local.remove(keys);
    setKey("");
    onKeyChange(false);
    for (const p of API_PLUGINS) onCredsChange?.(p.id, false);
    // Remount ApiPluginCreds so per-plugin credential inputs reset to empty.
    setResetNonce((n) => n + 1);
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

      {API_PLUGINS.map((p) => (
        <ApiPluginCreds
          key={`${p.id}-${resetNonce}`}
          plugin={p}
          onCredsChange={onCredsChange}
        />
      ))}

      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-medium text-gray-600 mb-1">Sync Data</p>
        <p className="text-[11px] text-gray-400 mb-3">
          Removes all cached accounts, mappings, sync history, and credentials.
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

type CredsProps = {
  plugin: ApiPlugin;
  onCredsChange?: (pluginId: string, hasAllCreds: boolean) => void;
};

function ApiPluginCreds({ plugin, onCredsChange }: CredsProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    browser.storage.local.get(credsKey(plugin.id)).then((s) => {
      const stored = (s[credsKey(plugin.id)] as Record<string, string>) ?? {};
      setValues(stored);
    });
  }, [plugin.id]);

  const hasAny = plugin.credentials.some((f) => !!values[f.key]?.trim());
  const hasAll = plugin.credentials.every((f) => !!values[f.key]?.trim());

  const handleSave = async () => {
    const trimmed = Object.fromEntries(
      plugin.credentials.map((f) => [f.key, values[f.key].trim()]),
    );
    await browser.storage.local.set({ [credsKey(plugin.id)]: trimmed });
    onCredsChange?.(plugin.id, true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    await browser.storage.local.remove(credsKey(plugin.id));
    setValues({});
    onCredsChange?.(plugin.id, false);
  };

  return (
    <div className="border-t border-gray-100 pt-5 mb-6">
      <p className="text-xs font-medium text-gray-600 mb-3">
        {plugin.name} Credentials
      </p>
      {plugin.credentials.map((f) => (
        <div key={f.key} className="mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            {f.label}
          </label>
          <input
            type={f.type}
            value={values[f.key] ?? ""}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [f.key]: e.target.value }));
              setSaved(false);
            }}
            className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
          {f.help && (
            <p className="text-[11px] text-gray-400 mt-1.5">{f.help}</p>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!hasAll}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-35 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
        {hasAny && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
