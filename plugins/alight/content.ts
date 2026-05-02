import { createMain, parseMoney, queryDeep } from "../content-utils";
import alight from "./index";

export function extractPortfolio(
	containers: Element[] = queryDeep("wsdc-line-item-container-v2"),
) {
	return containers.flatMap((container) => {
		const name = container
			.querySelector("[col-1] .bold-text")
			?.textContent?.trim();
		const subtitle = container
			.querySelector("[col-1] subtitle")
			?.textContent?.trim();
		const fullName =
			name && subtitle ? `${name} — ${subtitle}` : (name ?? subtitle);

		const balance = parseMoney(
			container
				.querySelector("[col-2] .items-center span")
				?.textContent?.trim() ?? null,
		);

		if (!fullName || balance === null) return [];

		return [
			{
				name: fullName,
				balance,
				accountId: null,
			},
		];
	});
}

export const main = createMain(alight.id, extractPortfolio);
