import { useEffect, useState } from "react";
import { isSplitValid, mappingTargets } from "~/lib/mapping";
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
	SplitMapping,
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

	const handleMappingChange = async (
		vKey: string,
		entry: string | SplitMapping,
	) => {
		const next: PLMappings = { ...mappings, [vKey]: entry };

		// Empty string clears the row to "Not mapped". Splits with no legs are
		// treated the same way to avoid persisting an unsyncable shell.
		if (
			entry === "" ||
			(typeof entry === "object" && entry.splits.length === 0)
		) {
			delete next[vKey];
		}

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

	// "Mapped" means the row will actually produce a sync entry. An all-ignore
	// split has truthy `plId`s on every leg but resolves to zero real targets,
	// so it should not inflate the counter.
	const mappedCount = accounts.filter(
		(acc, i) => mappingTargets(mappings[accountKey(acc, i)]).length > 0,
	).length;

	const hasInvalidSplit = accounts.some((acc, i) => {
		const entry = mappings[accountKey(acc, i)];
		return !isSplitValid(acc.balance, entry);
	});

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
					hasInvalidSplit={hasInvalidSplit}
					plSync={plSync}
					onSync={handleSync}
				/>
			)}
		</div>
	);
}
