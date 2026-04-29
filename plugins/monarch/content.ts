/**
 * Monarch's UI is built with styled-components, so most class names carry a
 * build-specific hash (e.g. `Text-qcxgyd-0`) that breaks across releases.
 * Two attributes are stable enough to anchor on:
 *
 *   - `a[href^="/accounts/details/<id>"]`  — one anchor per account row
 *   - `span.fs-exclude`                    — applied to the account name and
 *                                            balance for FullStory PII opt-out
 *
 * For each account anchor we read its `.fs-exclude` spans. The name and
 * balance are distinguished by feeding each value through `parseMoney`:
 * a successful numeric parse marks the balance, anything else is the name.
 * The account id comes from the href.
 */
import "~/assets/tailwind.css";
import monarch from "./index";
import { parseMoney, queryDeep, createMain } from "../content-utils";

export function extractAccountId(href?: string) {
  if (!href) return null;
  const match = href.match(/\/accounts\/details\/(\d+)/);
  return match ? match[1] : null;
}

export function extractPortfolio() {
  return queryDeep('a[href^="/accounts/details/"]').flatMap((anchor) => {
    const href = anchor.getAttribute("href")!;

    const fsSpans = anchor.querySelectorAll<HTMLSpanElement>("span.fs-exclude");
    let name: string | undefined;
    let balance: number | null = null;

    for (const span of fsSpans) {
      const text = span.textContent?.trim();
      if (!text) continue;
      const maybeMoney = parseMoney(text);
      if (maybeMoney !== null && !Number.isNaN(maybeMoney)) {
        balance ??= maybeMoney;
      } else {
        name ??= text;
      }
    }

    if (!name || balance === null) return [];

    return [
      {
        name,
        balance,
        accountId: extractAccountId(href),
      },
    ];
  });
}

export const main = createMain(monarch.id, extractPortfolio);
