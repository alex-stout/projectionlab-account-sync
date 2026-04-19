import { describe, it, expect, vi } from "vitest";
import { parseYTD, extractPortfolio, main } from "./content";

describe("parseYTD", () => {
  it("parses a positive value", () => {
    expect(parseYTD("+6.4%")).toBe(6.4);
  });

  it("parses a negative value", () => {
    expect(parseYTD("-3.2%")).toBe(-3.2);
  });

  it("parses a plain number string", () => {
    expect(parseYTD("5.0")).toBe(5.0);
  });

  it("returns null for null", () => {
    expect(parseYTD(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseYTD("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseYTD("n/a")).toBeNull();
  });
});

function makeContainer(
  name: string,
  subtitle: string | null,
  balance: string,
  ytd: string | null,
) {
  const el = document.createElement("div");
  el.innerHTML = `
    <div col-1>
      <span class="bold-text">${name}</span>
      ${subtitle != null ? `<subtitle>${subtitle}</subtitle>` : ""}
    </div>
    <div col-2>
      <div class="items-center"><span>${balance}</span></div>
      ${ytd != null ? `<span class="ml-xs">${ytd}</span>` : ""}
    </div>
  `;
  return el;
}

describe("extractPortfolio", () => {
  it("combines name and subtitle", () => {
    const result = extractPortfolio([
      makeContainer("Savings Plan", "Employer 401k", "$120,000", "+5.2%"),
    ]);
    expect(result).toEqual([
      {
        name: "Savings Plan — Employer 401k",
        balance: 120000,
        rateOfReturn: 5.2,
        accountId: null,
      },
    ]);
  });

  it("uses name alone when no subtitle", () => {
    const result = extractPortfolio([
      makeContainer("Basic Plan", null, "$50,000", null),
    ]);
    expect(result[0].name).toBe("Basic Plan");
  });

  it("omits rate of return when missing", () => {
    const result = extractPortfolio([
      makeContainer("Plan", "Sub", "$10,000", null),
    ]);
    expect(result[0].rateOfReturn).toBeNull();
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
