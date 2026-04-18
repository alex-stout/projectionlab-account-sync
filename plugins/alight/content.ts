import alight from "./index";
import { parseMoney, queryDeep, createMain } from "../content-utils";

export function parseYTD(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/[+-]?[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function extractPortfolio(containers: Element[] = queryDeep("wsdc-line-item-container-v2")) {
  return containers.flatMap((container) => {
    const name = container.querySelector("[col-1] .bold-text")?.textContent?.trim();
    const subtitle = container.querySelector("[col-1] subtitle")?.textContent?.trim();
    const fullName = name && subtitle ? `${name} — ${subtitle}` : (name ?? subtitle);

    const balance = parseMoney(container.querySelector("[col-2] .items-center span")?.textContent?.trim() ?? null);

    if (!fullName || balance === null) return [];

    return [{
      name: fullName,
      balance,
      rateOfReturn: parseYTD(container.querySelector("[col-2] .ml-xs")?.textContent?.trim() ?? null),
      accountId: null,
    }];
  });
}

export const main = createMain(alight.id, extractPortfolio);
