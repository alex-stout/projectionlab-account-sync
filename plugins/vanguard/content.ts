import { createMain, parseMoney, queryDeep } from "../content-utils";
import vanguard from "./index";

export function extractAccountId(scrollToId?: string | null) {
	return scrollToId?.trim() || null;
}

// Remove trailing * from account names
export function cleanName(raw: string): string {
	return raw.replace(/\s*-\s*\d+\*\s*$/, "").trim();
}

export function extractPortfolio() {
	return queryDeep("c11n-accordion[scroll-to-id]").flatMap((container) => {
		const rawName = container
			.querySelector(".c11n-accordion__heading")
			?.textContent?.trim();
		const name = rawName ? cleanName(rawName) : undefined;
		const balance = parseMoney(
			container
				.querySelector(".c11n-accordion__content")
				?.textContent?.trim() ?? null,
		);

		if (!name || balance === null) return [];

		return [
			{
				name,
				balance,
				accountId: extractAccountId(container.getAttribute("scroll-to-id")),
			},
		];
	});
}

export const main = createMain(vanguard.id, extractPortfolio);
