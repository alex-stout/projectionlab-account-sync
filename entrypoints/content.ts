import type { ContentScriptContext } from "#imports";
import "~/assets/tailwind.css";

console.log("CONTENT SCRIPT LOADED1");

function parseMoney(value: string | null) {
  if (!value) return null;
  return Number(value.replace(/[$,]/g, ""));
}

function parsePercent(value: string | null) {
  if (!value) return null;
  return Number(value.replace("%", ""));
}

function extractAccountId(href?: string) {
  if (!href) return null;
  const match = href.match(/ss-accountIds=(\d+)/);
  return match ? match[1] : null;
}

export default defineContentScript({
  matches: ["https://dashboard.web.vanguard.com/", "http://localhost/*"],
  main() {
    console.log("CONTENT SCRIPT LOADED");
    browser.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      if (msg.type === "SYNC_REQUEST") {
        const data = extractPortfolio();
        browser.runtime.sendMessage({ type: "SYNC_DATA", payload: data });
      }
    });
  },
});

function queryDeep(
  selector: string,
  root: Document | ShadowRoot = document,
): Element[] {
  let results: Element[] = [];

  results.push(...Array.from(root.querySelectorAll(selector)));

  const elements = Array.from(root.querySelectorAll("*"));

  for (const el of elements) {
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) {
      results = results.concat(queryDeep(selector, shadow));
    }
  }

  return results;
}

function extractPortfolio() {
  console.log("Extracting portfolio: Shadow");
  const containers = queryDeep(".individual-account-container");

  console.log(`Found containers: ${containers.length}`);
  return [...containers].map((container) => {
    const nameEl = container.querySelector(".account-holdings-link");

    let href: string | null = null;

    if (nameEl instanceof HTMLAnchorElement) {
      href = nameEl.href;
    }

    const balanceEl = container.querySelector(".balance span");
    const returnEl = container.querySelector(".rate-of-return span");

    const name = nameEl?.textContent?.trim() || null;
    const balanceRaw = balanceEl?.textContent?.trim() || null;
    const returnRaw = returnEl?.textContent?.trim() || null;

    return {
      name,
      balance: parseMoney(balanceRaw),
      rateOfReturn: parsePercent(returnRaw),
      accountId: extractAccountId(href ?? undefined),
    };
  });
}
