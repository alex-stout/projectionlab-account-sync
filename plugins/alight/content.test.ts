import { describe, it, expect, vi } from "vitest";
import { extractPortfolio, main } from "./content";

function makeContainer(
  name: string,
  subtitle: string | null,
  balance: string,
) {
  const el = document.createElement("div");
  el.innerHTML = `
    <div col-1>
      <span class="bold-text">${name}</span>
      ${subtitle != null ? `<subtitle>${subtitle}</subtitle>` : ""}
    </div>
    <div col-2>
      <div class="items-center"><span>${balance}</span></div>
    </div>
  `;
  return el;
}

describe("extractPortfolio", () => {
  it("combines name and subtitle", () => {
    const result = extractPortfolio([
      makeContainer("Savings Plan", "Employer 401k", "$120,000"),
    ]);
    expect(result).toEqual([
      {
        name: "Savings Plan — Employer 401k",
        balance: 120000,
        accountId: null,
      },
    ]);
  });

  it("uses name alone when no subtitle", () => {
    const result = extractPortfolio([
      makeContainer("Basic Plan", null, "$50,000"),
    ]);
    expect(result[0].name).toBe("Basic Plan");
  });

  it("skips containers missing name and subtitle", () => {
    const el = document.createElement("div");
    el.innerHTML = `<div col-2><div class="items-center"><span>$10,000</span></div></div>`;
    expect(extractPortfolio([el])).toEqual([]);
  });

  it("skips containers missing balance", () => {
    const el = document.createElement("div");
    el.innerHTML = `<div col-1><span class="bold-text">Plan</span></div>`;
    expect(extractPortfolio([el])).toEqual([]);
  });

  it("returns empty for empty array", () => {
    expect(extractPortfolio([])).toEqual([]);
  });
});

describe("main", () => {
  it("registers a listener and calls sendResponse with { ok, payload } on SYNC_REQUEST", async () => {
    document.body.innerHTML = `
      <wsdc-line-item-container-v2>
        <div col-1><span class="bold-text">401k</span><subtitle>Core</subtitle></div>
        <div col-2><div class="items-center"><span>$10,000</span></div></div>
      </wsdc-line-item-container-v2>
    `;
    main();
    const listener = vi
      .mocked(browser.runtime.onMessage.addListener)
      .mock.calls.at(-1)![0];
    const sendResponse = vi.fn();
    const returned = listener(
      { type: "SYNC_REQUEST" },
      {} as any,
      sendResponse,
    );
    expect(returned).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, payload: expect.any(Array) }),
    );
  });
});
