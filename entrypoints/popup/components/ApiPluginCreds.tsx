import { useEffect, useState } from "react";
import { clearCreds, getCreds, setCreds } from "~/lib/storage";
import type { ApiPlugin } from "~/plugins";

type CredsProps = {
	plugin: ApiPlugin;
	onCredsChange?: (pluginId: string, hasAllCreds: boolean) => void;
};

export default function ApiPluginCreds({ plugin, onCredsChange }: CredsProps) {
	const [values, setValues] = useState<Record<string, string>>({});
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		getCreds(plugin.id).then(setValues);
	}, [plugin.id]);

	const hasAny = plugin.credentials.some((f) => !!values[f.key]?.trim());
	const hasAll = plugin.credentials.every((f) => !!values[f.key]?.trim());

	const handleSave = async () => {
		const trimmed = Object.fromEntries(
			plugin.credentials.map((f) => [f.key, values[f.key].trim()]),
		);
		await setCreds(plugin.id, trimmed);
		onCredsChange?.(plugin.id, true);
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const handleClear = async () => {
		await clearCreds(plugin.id);
		setValues({});
		onCredsChange?.(plugin.id, false);
	};

	return (
		<div className="border-t border-gray-100 pt-5 mb-6">
			<p className="text-xs font-medium text-gray-600 mb-3">
				{plugin.name} Credentials
			</p>
			{plugin.credentials.map((f) => {
				const inputId = `${plugin.id}-${f.key}`;
				return (
					<div key={f.key} className="mb-3">
						<label
							htmlFor={inputId}
							className="text-xs font-medium text-gray-600 mb-1.5 block"
						>
							{f.label}
						</label>
						<input
							id={inputId}
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
				);
			})}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={handleSave}
					disabled={!hasAll}
					className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-35 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
				>
					{saved ? "✓ Saved" : "Save"}
				</button>
				{hasAny && (
					<button
						type="button"
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
