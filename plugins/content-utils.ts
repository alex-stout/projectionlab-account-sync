export function parseMoney(value: string | null): number | null {
  if (!value) return null;
  return Number(value.replace(/[$,]/g, ""));
}

export function queryDeep(
  selector: string,
  root: Document | ShadowRoot | Element = document,
): Element[] {
  const results: Element[] = [...root.querySelectorAll(selector)];
  for (const el of root.querySelectorAll("*")) {
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) results.push(...queryDeep(selector, shadow));
  }
  return results;
}

const ISSUES_URL =
  "https://github.com/alex-stout/projectionlab-account-sync/issues";

export function createMain(
  _sourceId: string,
  extract: () => Promise<unknown[]> | unknown[],
) {
  return function main() {
    browser.runtime.onMessage.addListener(
      (msg: { type: string }, _sender: any, sendResponse: (r: any) => void) => {
        if (msg.type === "SYNC_REQUEST") {
          const p = Promise.resolve(extract()).then((payload) => {
            if (payload.length === 0) {
              return {
                ok: false,
                error: `No accounts found on this page. Make sure you're on the right page with accounts loaded. If the problem persists, please open an issue at ${ISSUES_URL}`,
              };
            }
            return { ok: true, payload };
          });
          if (import.meta.env.BROWSER === "firefox") return p as any;
          p.then(sendResponse);
          return true;
        }
      },
    );
  };
}
