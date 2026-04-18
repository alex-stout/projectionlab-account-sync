import "~/assets/tailwind.css";
import vanguard from "./index";
import { parseMoney, queryDeep, createMain } from "../content-utils";

export function parsePercent(value: string | null) {
  if (!value) return null;
  return Number(value.replace("%", ""));
}

export function extractAccountId(href?: string) {
  if (!href) return null;
  const match = href.match(/ss-accountIds=(\d+)/);
  return match ? match[1] : null;
}

export function extractPortfolio() {
  return queryDeep(".individual-account-container").flatMap((container) => {
    const nameEl = container.querySelector(".account-holdings-link");
    let href: string | null = null;
    if (nameEl instanceof HTMLAnchorElement) href = nameEl.href;

    const name = nameEl?.textContent?.trim();
    const balance = parseMoney(container.querySelector(".balance span")?.textContent?.trim() ?? null);

    if (!name || balance === null) return [];

    return [{
      name,
      balance,
      rateOfReturn: parsePercent(container.querySelector(".rate-of-return span")?.textContent?.trim() ?? null),
      accountId: extractAccountId(href ?? undefined),
    }];
  });
}

export const main = createMain(vanguard.id, extractPortfolio);
