// Firefox-only global available in content scripts
declare function cloneInto<T>(obj: T, targetScope: Window): T;

type ContentMessage =
  | { type: "FETCH_PL_ACCOUNTS"; apiKey: string }
  | { type: "SYNC_ENTRIES"; entries: unknown[]; apiKey: string };

const PL_MATCHES = [
  "https://app.projectionlab.com/*",
  "https://ea.projectionlab.com/*",
] as const;

export default defineContentScript({
  matches: [...PL_MATCHES],
  async main() {
    console.log(
      "[PL-ext content] content script loaded, injecting main world script...",
    );
    try {
      await injectScript("/projectionlab-main.js", { keepInDom: true });
      console.log("[PL-ext content] main world script injected");
    } catch (e) {
      console.error("[PL-ext content] injectScript failed:", e);
    }

    browser.runtime.onMessage.addListener((msg: ContentMessage) => {
      console.log("[PL-ext content] message received:", msg.type);
      if (msg.type === "FETCH_PL_ACCOUNTS") {
        return bridge("pl-ext-fetch-accounts", { apiKey: msg.apiKey });
      }
      if (msg.type === "SYNC_ENTRIES") {
        return bridge("pl-ext-sync-entries", {
          entries: msg.entries,
          apiKey: msg.apiKey,
        });
      }
    });
  },
});

export function bridge(
  eventName: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const id = Math.random().toString(36).slice(2);
  console.log("[PL-ext content] bridging to main world:", eventName, id);
  return new Promise((resolve) => {
    window.addEventListener(
      `pl-ext-result-${id}`,
      (e: Event) => {
        // Unwrap Firefox xray wrapper on the result coming back from page world
        const detail = (e as CustomEvent<unknown>).detail;
        const unwrapped =
          typeof detail === "object" && detail !== null
            ? JSON.parse(JSON.stringify(detail))
            : detail;
        console.log("[PL-ext content] got result from main world:", unwrapped);
        resolve(unwrapped);
      },
      { once: true },
    );
    const raw = { id, ...payload };
    // cloneInto is Firefox-only — copies objects into the page compartment so
    // the MAIN world script can read their properties without xray restrictions.
    const detail =
      typeof cloneInto !== "undefined" ? cloneInto(raw, window) : raw;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}
