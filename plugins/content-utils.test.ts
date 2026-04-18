import { describe, it, expect, vi } from "vitest";
import { parseMoney, queryDeep, createMain } from "./content-utils";

describe("parseMoney", () => {
  it("parses a dollar amount with commas", () => {
    expect(parseMoney("$1,234.56")).toBe(1234.56);
  });

  it("parses without dollar sign", () => {
    expect(parseMoney("1000")).toBe(1000);
  });

  it("returns null for null", () => {
    expect(parseMoney(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMoney("")).toBeNull();
  });
});

describe("queryDeep", () => {
  it("finds elements in the light DOM", () => {
    document.body.innerHTML = `<div class="target"></div><div class="target"></div>`;
    expect(queryDeep(".target").length).toBe(2);
  });

  it("returns empty array when nothing matches", () => {
    document.body.innerHTML = `<div class="other"></div>`;
    expect(queryDeep(".target")).toEqual([]);
  });

  it("searches a custom root", () => {
    document.body.innerHTML = `<div id="root"><span class="item"></span></div>`;
    const root = document.getElementById("root")!;
    expect(queryDeep(".item", root).length).toBe(1);
  });

  it("searches inside shadow roots", () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById("host")!;
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("span");
    inner.className = "shadow-item";
    shadow.appendChild(inner);
    expect(queryDeep(".shadow-item").length).toBe(1);
  });
});

describe("createMain", () => {
  it("registers a message listener on call", () => {
    const extract = vi.fn().mockReturnValue([]);
    const main = createMain("test-plugin", extract);
    main();
    expect(browser.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it("sends SYNC_DATA with payload on SYNC_REQUEST", async () => {
    const payload = [{ name: "Account", balance: 100, rateOfReturn: null, accountId: null }];
    const extract = vi.fn().mockReturnValue(payload);
    const main = createMain("test-plugin", extract);
    main();

    const listener = vi.mocked(browser.runtime.onMessage.addListener).mock.calls.at(-1)![0];
    listener({ type: "SYNC_REQUEST" }, {} as any, () => {});

    await Promise.resolve();

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "SYNC_DATA",
      sourceId: "test-plugin",
      payload,
    });
  });

  it("ignores non-SYNC_REQUEST messages", async () => {
    const extract = vi.fn();
    const main = createMain("test-plugin", extract);
    main();

    const listener = vi.mocked(browser.runtime.onMessage.addListener).mock.calls.at(-1)![0];
    listener({ type: "OTHER_MESSAGE" }, {} as any, () => {});

    await Promise.resolve();
    expect(extract).not.toHaveBeenCalled();
  });

  it("works with an async extract function", async () => {
    const payload = [{ name: "Async Account", balance: 500, rateOfReturn: null, accountId: null }];
    const extract = vi.fn().mockResolvedValue(payload);
    const main = createMain("test-plugin", extract);
    main();

    const listener = vi.mocked(browser.runtime.onMessage.addListener).mock.calls.at(-1)![0];
    listener({ type: "SYNC_REQUEST" }, {} as any, () => {});

    await new Promise((r) => setTimeout(r, 0));

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: "SYNC_DATA",
      sourceId: "test-plugin",
      payload,
    });
  });
});
