declare const __E2E__: boolean;

interface ProjectionLabPluginAPI {
	exportData(opts: { key: string }): Promise<unknown>;
	updateAccount(
		id: string,
		update: { balance: number },
		opts: { key: string },
	): Promise<void>;
}

interface Window {
	projectionlabPluginAPI?: ProjectionLabPluginAPI;
}
