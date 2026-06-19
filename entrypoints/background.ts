import { expandToSyncCandidates } from "~/lib/mapping";
import {
	getAccounts,
	getCreds,
	getMappingKey,
	getMappings,
	getPlApiKey,
	setAccounts,
	setLastSynced,
} from "~/lib/storage";
import { PL_MATCHES } from "~/lib/urls";
import { PLUGINS } from "~/plugins";
import type { Account, SyncEntry } from "~/types";

type BgMessage =
	| { type: "SYNC_SOURCE"; sourceId: string }
	| { type: "FETCH_PL_ACCOUNTS" }
	| { type: "SYNC_TO_PL"; sourceId: string };

export async function getPlTab() {
	for (const url of PL_MATCHES) {
		const tabs = await browser.tabs.query({ url });
		if (tabs.length > 0) return tabs[0];
	}
	return null;
}

export async function getSourceTab(sourceId: string) {
	const plugin = PLUGINS.find((p) => p.id === sourceId);
	if (plugin?.kind !== "content") return null;
	for (const pattern of plugin.urlPatterns) {
		const tabs = await browser.tabs.query({ url: pattern });
		if (tabs.length > 0) return tabs[0];
	}
	return null;
}

async function handleMessage(msg: BgMessage): Promise<unknown> {
	if (msg.type === "SYNC_SOURCE") {
		const plugin = PLUGINS.find((p) => p.id === msg.sourceId);
		if (!plugin) return { error: `Unknown plugin: ${msg.sourceId}` };

		let accounts: Account[];
		if (plugin.kind === "content") {
			let tab: Awaited<ReturnType<typeof getSourceTab>>;
			try {
				tab = await getSourceTab(msg.sourceId);
			} catch {
				tab = null;
			}
			if (!tab?.id) {
				return {
					error: `${plugin.name} is not open. Navigate to ${plugin.name} and try again.`,
				};
			}

			let tabResult:
				| { ok: true; payload: Account[] }
				| { ok: false; error?: string }
				| null;
			try {
				tabResult = await browser.tabs.sendMessage(tab.id, {
					type: "SYNC_REQUEST",
				});
			} catch {
				tabResult = null;
			}

			if (!tabResult?.ok) {
				return {
					error:
						tabResult?.error ??
						`Failed to read data from ${plugin.name}. Try refreshing the page.`,
				};
			}
			accounts = tabResult.payload;
		} else {
			const creds = await getCreds(plugin.id);
			const missing = plugin.credentials.filter((f) => !creds[f.key]?.trim());
			if (missing.length > 0) {
				return {
					error: `${plugin.name} credentials are not set. Open Settings to add them.`,
				};
			}
			try {
				accounts = await plugin.refresh(creds);
			} catch (e) {
				return {
					error:
						e instanceof Error
							? e.message
							: `Failed to fetch from ${plugin.name}.`,
				};
			}
		}

		await setAccounts(msg.sourceId, accounts);

		return { ok: true, accounts };
	}

	if (msg.type === "FETCH_PL_ACCOUNTS") {
		const apiKey = await getPlApiKey();
		if (!apiKey)
			return {
				error:
					"No API key set. Open extension settings to add your ProjectionLab API key.",
			};
		const tab = await getPlTab();
		if (!tab?.id) {
			return { error: "ProjectionLab is not open. Open it and try again." };
		}
		return browser.tabs.sendMessage(tab.id, {
			type: "FETCH_PL_ACCOUNTS",
			apiKey,
		});
	}

	if (msg.type === "SYNC_TO_PL") {
		const apiKey = await getPlApiKey();
		if (!apiKey)
			return {
				error:
					"No API key set. Open extension settings to add your ProjectionLab API key.",
			};
		const { sourceId } = msg;
		const tab = await getPlTab();
		if (!tab?.id) {
			return { error: "ProjectionLab is not open. Open it and try again." };
		}

		const allSources = await Promise.all(
			PLUGINS.map(async (plugin) => {
				const pluginId = plugin.id;

				const [accounts, mappings] = await Promise.all([
					getAccounts(pluginId),
					getMappings(pluginId),
				]);

				return { id: pluginId, accounts, mappings };
			}),
		);

		const current = allSources.find((s) => s.id === sourceId);

		const targetPlIds = new Set<string>();

		for (const account of current?.accounts ?? []) {
			const entry = current?.mappings[getMappingKey(account)];
			for (const candidate of expandToSyncCandidates(account, entry)) {
				targetPlIds.add(candidate.plId);
			}
		}

		const grouped = new Map<string, SyncEntry>();

		for (const { accounts, mappings } of allSources) {
			for (const account of accounts) {
				const entry = mappings[getMappingKey(account)];
				for (const candidate of expandToSyncCandidates(account, entry)) {
					if (!targetPlIds.has(candidate.plId)) continue;
					const existing = grouped.get(candidate.plId);
					if (existing) {
						existing.balance += candidate.balance;
						existing.name = `${existing.name} + ${candidate.name}`;
					} else {
						grouped.set(candidate.plId, { ...candidate });
					}
				}
			}
		}
		const entries: SyncEntry[] = Array.from(grouped.values());

		if (entries.length === 0) {
			return { error: "No mapped accounts with balances to sync." };
		}

		const result = await browser.tabs.sendMessage(tab.id, {
			type: "SYNC_ENTRIES",
			entries,
			apiKey,
		});

		if (result && !result.error) {
			await setLastSynced(sourceId);
		}

		return result;
	}
}

export default defineBackground(() => {
	browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
		handleMessage(msg as BgMessage).then(sendResponse);
		return true;
	});
});
