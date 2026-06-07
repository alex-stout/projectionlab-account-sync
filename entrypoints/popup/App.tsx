import { useEffect, useState } from "react";
import {
	getAppHydration,
	getCreds,
	setDisabledPlugins as persistDisabledPlugins,
	setPLAccounts as persistPlAccounts,
} from "~/lib/storage";
import { PLUGINS } from "~/plugins";
import type { PlAccount } from "~/types";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./SettingsPanel";
import SourcePanel from "./SourcePanel";

export default function Popup() {
	const [activeId, setActiveId] = useState(PLUGINS[0].id);
	const [view, setView] = useState<"main" | "settings">("main");
	const [hasApiKey, setHasApiKey] = useState(false);
	const [plAccounts, setPlAccounts] = useState<PlAccount[]>([]);
	const [plLoading, setPlLoading] = useState(false);
	const [plError, setPlError] = useState<string | null>(null);
	const [plLastRefreshed, setPlLastRefreshed] = useState<number | null>(null);
	const [lastSynced, setLastSynced] = useState<Record<string, number>>({});
	const [lastRefreshed, setLastRefreshed] = useState<Record<string, number>>(
		{},
	);
	const [available, setAvailable] = useState<Record<string, boolean>>({});
	const [disabledPlugins, setDisabledPlugins] = useState<string[]>([]);

	useEffect(() => {
		getAppHydration().then((state) => {
			setHasApiKey(state.hasApiKey);
			setPlAccounts(state.plAccounts);
			setPlLastRefreshed(state.plLastRefreshed);
			setDisabledPlugins(state.disabledPlugins);
			setLastSynced(state.lastSynced);
			setLastRefreshed(state.lastRefreshed);
		});

		Promise.all(
			PLUGINS.map(async (plugin) => {
				if (plugin.kind === "api") {
					const creds = await getCreds(plugin.id);

					const hasAll = plugin.credentials.every(
						(f) => !!creds[f.key]?.trim(),
					);

					return [plugin.id, hasAll] as const;
				}

				const tabs = await Promise.all(
					plugin.urlPatterns.map((url) => browser.tabs.query({ url })),
				);

				return [plugin.id, tabs.flat().length > 0] as const;
			}),
		).then((entries) => setAvailable(Object.fromEntries(entries)));
	}, []);

	const handleRefreshPl = async () => {
		setPlLoading(true);
		setPlError(null);
		const response = (await browser.runtime.sendMessage({
			type: "FETCH_PL_ACCOUNTS",
		})) as { accounts?: PlAccount[]; error?: string };
		if (response?.accounts) {
			setPlAccounts(response.accounts);
			setPlLastRefreshed(Date.now());
			await persistPlAccounts(response.accounts);
		} else if (response?.error) {
			setPlError(response.error);
		}
		setPlLoading(false);
	};

	const handleSynced = (sourceId: string) => {
		setLastSynced((prev) => ({ ...prev, [sourceId]: Date.now() }));
	};

	const handleRefreshed = (sourceId: string) => {
		setLastRefreshed((prev) => ({ ...prev, [sourceId]: Date.now() }));
	};

	const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
		const next = enabled
			? disabledPlugins.filter((id) => id !== pluginId)
			: [...disabledPlugins, pluginId];
		setDisabledPlugins(next);
		await persistDisabledPlugins(next);
	};

	const enabledPlugins = PLUGINS.filter((p) => !disabledPlugins.includes(p.id));
	const activePlugin =
		enabledPlugins.find((p) => p.id === activeId) ?? enabledPlugins[0];
	const forceSettings = !activePlugin;
	const showSettings = view === "settings" || forceSettings;

	return (
		<div className="flex w-full h-full min-w-135 bg-white text-sm text-gray-900 overflow-hidden">
			<Sidebar
				plugins={enabledPlugins}
				activeId={activePlugin?.id ?? ""}
				lastSynced={lastSynced}
				available={available}
				settingsActive={showSettings}
				hasApiKey={hasApiKey}
				onSelect={(id) => {
					setActiveId(id);
					setView("main");
				}}
				onSettings={() => setView(view === "settings" ? "main" : "settings")}
			/>

			<div className="flex flex-col flex-1 min-w-0">
				{showSettings ? (
					<SettingsPanel
						onKeyChange={setHasApiKey}
						onCredsChange={(pluginId, hasAllCreds) =>
							setAvailable((prev) => ({ ...prev, [pluginId]: hasAllCreds }))
						}
						onDataCleared={() => {
							setPlAccounts([]);
							setLastSynced({});
							setLastRefreshed({});
							setPlLastRefreshed(null);
							setDisabledPlugins([]);
						}}
						plAccounts={plAccounts}
						plLoading={plLoading}
						plError={plError}
						plLastRefreshed={plLastRefreshed}
						onRefreshPL={handleRefreshPl}
						disabledPlugins={disabledPlugins}
						onTogglePlugin={handleTogglePlugin}
					/>
				) : activePlugin ? (
					<>
						<div className="h-11.5 flex items-center px-4 border-b border-gray-100 shrink-0">
							<span className="font-semibold text-gray-800 text-sm">
								{activePlugin.name}
							</span>
							<span className="mx-2 text-gray-300">→</span>
							<span className="font-semibold text-gray-800 text-sm">
								ProjectionLab
							</span>
						</div>

						<SourcePanel
							key={activePlugin.id}
							plugin={activePlugin}
							plAccounts={plAccounts}
							lastRefreshed={lastRefreshed[activePlugin.id] ?? null}
							onSynced={() => handleSynced(activePlugin.id)}
							onRefreshed={() => handleRefreshed(activePlugin.id)}
						/>
					</>
				) : null}
			</div>
		</div>
	);
}
