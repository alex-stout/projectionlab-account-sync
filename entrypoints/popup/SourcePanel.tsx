import { useEffect, useState } from "react";
import {
	getOtherSourceMappings,
	getSourceState,
	setMappings as persistMappings,
} from "~/lib/storage";
import type { SourcePlugin } from "~/plugins";
import type {
	Account,
	PLMappings,
	PlAccount,
	PlSyncState,
	SyncResult,
} from "~/types";
import AccountList from "./components/AccountList";
import PanelHeader from "./components/PanelHeader";
import SyncFooter from "./components/SyncFooter";
import { accountKey } from "./utils";

type Props = {
	plugin: SourcePlugin;
	plAccounts: PlAccount[];
	lastRefreshed: number | null;
	onSynced: () => void;
	onRefreshed: () => void;
};

export default function SourcePanel({
	plugin,
	plAccounts,
	lastRefreshed,
	onSynced,
	onRefreshed,
}: Props) {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [mappings, setPLMappings] = useState<PLMappings>({});
	const [otherSourceMappings, setOtherSourceMappings] = useState<
		Record<string, string[]>
	>({});
	const [loading, setLoading] = useState(false);
	const [sourceError, setSourceError] = useState<string | null>(null);
	const [plSync, setPlSync] = useState<PlSyncState>({ status: "idle" });

	useEffect(() => {
		getSourceState(plugin.id).then((state) => {
			setAccounts(state.accounts);
			setPLMappings(state.mappings);
		});
		getOtherSourceMappings(plugin.id).then(setOtherSourceMappings);
		setPlSync({ status: "idle" });
		setSourceError(null);
	}, [plugin.id]);

	const handleRefreshSource = async () => {
		setSourceError(null);
		setLoading(true);
		let response: { ok?: boolean; accounts?: Account[]; error?: string };
		try {
			response = await browser.runtime.sendMessage({
				type: "SYNC_SOURCE",
				sourceId: plugin.id,
			});
		} catch (e) {
			setSourceError(
				e instanceof Error
					? e.message
					: "Failed to communicate with background.",
			);
			setLoading(false);
			return;
		}
		if (!response || response?.error) {
			setSourceError(
				response?.error ??
					`${plugin.name} is not open. Navigate to ${plugin.name} and try again.`,
			);
			setLoading(false);
			return;
		}
		setAccounts(response.accounts ?? []);
		setLoading(false);
		onRefreshed();
	};

	const handleMappingChange = async (vKey: string, plId: string) => {
		const next = { ...mappings, [vKey]: plId };

		if (!plId) delete next[vKey];

		setPLMappings(next);

		await persistMappings(plugin.id, next);
	};

	const handleSync = async () => {
		setPlSync({ status: "syncing" });
		const response = (await browser.runtime.sendMessage({
			type: "SYNC_TO_PL",
			sourceId: plugin.id,
		})) as { results?: SyncResult[]; error?: string };
		if (response?.error) {
			setPlSync({ status: "error", message: response.error });
		} else {
			setPlSync({ status: "done", results: response.results ?? [] });
			onSynced();
		}
	};

	const mappedCount = accounts.filter(
		(acc, i) => !!mappings[accountKey(acc, i)],
	).length;

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<PanelHeader
				pluginName={plugin.name}
				loading={loading}
				lastRefreshed={lastRefreshed}
				onRefreshSource={handleRefreshSource}
			/>

			<AccountList
				plugin={plugin}
				accounts={accounts}
				mappings={mappings}
				plAccounts={plAccounts}
				otherSourceMappings={otherSourceMappings}
				sourceError={sourceError}
				onMappingChange={handleMappingChange}
			/>

			{accounts.length > 0 && (
				<SyncFooter
					mappedCount={mappedCount}
					totalCount={accounts.length}
					plAccountsLoaded={plAccounts.length > 0}
					plSync={plSync}
					onSync={handleSync}
				/>
			)}
		</div>
	);
}
