import { PL_MATCHES } from "~/lib/urls";

// Firefox-only global available in content scripts
declare function cloneInto<T>(obj: T, targetScope: Window): T;

type ContentMessage =
  | { type: "FETCH_PL_ACCOUNTS"; apiKey: string }
  | { type: "SYNC_ENTRIES"; entries: unknown[]; apiKey: string };

export default defineContentScript({
  matches: [...PL_MATCHES],
  main() {
    // Capture the injection promise so the bridge waits for the main world script
    // before dispatching events. The listener is registered synchronously so the
    // message port is never missed, even if injection takes a moment.
    const ready = injectScript("/projectionlab-main.js", {
      keepInDom: true,
    }).catch(() => {});

    browser.runtime.onMessage.addListener(
      (msg: ContentMessage, _sender: any, sendResponse: (r: any) => void) => {
        if (msg.type === "FETCH_PL_ACCOUNTS") {
          const p = ready.then(() =>
            bridge("pl-ext-fetch-accounts", { apiKey: msg.apiKey }),
          );
          if (import.meta.env.BROWSER === "firefox") return p as any;
          p.then(sendResponse);
          return true;
        }
        if (msg.type === "SYNC_ENTRIES") {
          const p = ready.then(() =>
            bridge("pl-ext-sync-entries", {
              entries: msg.entries,
              apiKey: msg.apiKey,
            }),
          );
          if (import.meta.env.BROWSER === "firefox") return p as any;
          p.then(sendResponse);
          return true;
        }
      },
    );
  },
});

export function bridge(
  eventName: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const id = Math.random().toString(36).slice(2);
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
