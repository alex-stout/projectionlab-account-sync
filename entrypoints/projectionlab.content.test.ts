import { describe, it, expect } from "vitest";
import { bridge } from "./projectionlab.content";

describe("bridge", () => {
  function simulateMainWorldResponse(eventName: string, payload: Record<string, unknown>) {
    window.addEventListener(eventName, (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      window.dispatchEvent(new CustomEvent(`pl-ext-result-${id}`, { detail: payload }));
    }, { once: true });
  }

  it("dispatches a CustomEvent and resolves with the result", async () => {
    simulateMainWorldResponse("pl-ext-fetch-accounts", { accounts: [{ id: "1", name: "IRA" }] });
    const result = await bridge("pl-ext-fetch-accounts", { apiKey: "key" }) as { accounts: { id: string; name: string }[] };
    expect(result.accounts).toEqual([{ id: "1", name: "IRA" }]);
  });

  it("passes payload fields in the dispatched event", async () => {
    const received: Array<{ id: string; entries: unknown[] }> = [];
    window.addEventListener("pl-ext-sync-entries", (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; entries: unknown[] }>).detail;
      received.push(detail);
      window.dispatchEvent(new CustomEvent(`pl-ext-result-${detail.id}`, { detail: { results: [] } }));
    }, { once: true });

    await bridge("pl-ext-sync-entries", { entries: [{ plId: "x", balance: 100 }], apiKey: "key" });
    expect(received[0].entries).toEqual([{ plId: "x", balance: 100 }]);
  });

  it("handles non-object detail by resolving the raw value", async () => {
    window.addEventListener("pl-ext-test", (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      window.dispatchEvent(new CustomEvent(`pl-ext-result-${id}`, { detail: "plain-string" }));
    }, { once: true });

    const result = await bridge("pl-ext-test", {});
    expect(result).toBe("plain-string");
  });
});
