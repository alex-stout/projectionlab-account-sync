export function parseMoney(value: string | null): number | null {
  if (!value) return null;
  return Number(value.replace(/[$,]/g, ""));
}

export function queryDeep(selector: string, root: Document | ShadowRoot = document): Element[] {
  const results: Element[] = [...root.querySelectorAll(selector)];
  for (const el of root.querySelectorAll("*")) {
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) results.push(...queryDeep(selector, shadow));
  }
  return results;
}

export function createMain(sourceId: string, extract: () => Promise<unknown[]> | unknown[]) {
  return function main() {
    browser.runtime.onMessage.addListener((msg: { type: string }) => {
      if (msg.type === "SYNC_REQUEST") {
        Promise.resolve(extract()).then((payload) => {
          browser.runtime.sendMessage({ type: "SYNC_DATA", sourceId, payload });
        });
      }
    });
  };
}
