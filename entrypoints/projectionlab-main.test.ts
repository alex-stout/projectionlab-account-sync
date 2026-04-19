import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SyncResult } from "~/types";
import setup from "./projectionlab-main";

const mockApi = {
  exportData: vi.fn(),
  updateAccount: vi.fn(),
};

// Register window listeners once
(setup as any)();

beforeEach(() => {
  (window as any).projectionlabPluginAPI = mockApi;
  mockApi.exportData.mockReset();
  mockApi.updateAccount.mockReset();
});

function dispatch(eventName: string, detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function waitForResult(id: string): Promise<any> {
  return new Promise((resolve) => {
    window.addEventListener(
      `pl-ext-result-${id}`,
      (e: Event) => resolve((e as CustomEvent<unknown>).detail),
      { once: true },
    );
  });
}

describe("pl-ext-fetch-accounts", () => {
  it("returns accounts from exportData", async () => {
    mockApi.exportData.mockResolvedValue({
      today: {
        savingsAccounts: [{ id: "s1", name: "Savings" }],
        investmentAccounts: [{ id: "i1", name: "IRA" }],
        assets: [],
        debts: [],
      },
    });

    const result = waitForResult("fetch-1");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-1", apiKey: "key" });
    expect((await result).accounts).toEqual([
      { id: "s1", name: "Savings" },
      { id: "i1", name: "IRA" },
    ]);
  });

  it("returns error when plugin API is missing", async () => {
    (window as any).projectionlabPluginAPI = undefined;

    const result = waitForResult("fetch-2");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-2", apiKey: "key" });
    expect((await result).error).toMatch(/not found/i);
  });

  it("returns error when exportData throws", async () => {
    mockApi.exportData.mockRejectedValue(new Error("API failure"));

    const result = waitForResult("fetch-3");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-3", apiKey: "key" });
    expect((await result).error).toMatch(/API failure/);
  });

  it("returns error when thrown error has no message", async () => {
    mockApi.exportData.mockRejectedValue("raw string error");

    const result = waitForResult("fetch-4");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-4", apiKey: "key" });
    expect((await result).error).toMatch(/raw string error/);
  });

  it("handles exportData response with no today key", async () => {
    mockApi.exportData.mockResolvedValue({});

    const result = waitForResult("fetch-5");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-5", apiKey: "key" });
    expect((await result).accounts).toEqual([]);
  });

  it("handles missing account arrays in today", async () => {
    mockApi.exportData.mockResolvedValue({
      today: { savingsAccounts: [{ id: "s1", name: "S" }] },
    });

    const result = waitForResult("fetch-6");
    dispatch("pl-ext-fetch-accounts", { id: "fetch-6", apiKey: "key" });
    expect((await result).accounts).toEqual([{ id: "s1", name: "S" }]);
  });
});

describe("pl-ext-sync-entries", () => {
  it("calls updateAccount for each entry and returns results", async () => {
    mockApi.updateAccount.mockResolvedValue(undefined);
    const entries = [
      { plId: "acc-1", balance: 1000, name: "IRA" },
      { plId: "acc-2", balance: 2000, name: "401k" },
    ];

    const result = waitForResult("sync-1");
    dispatch("pl-ext-sync-entries", { id: "sync-1", entries, apiKey: "key" });
    const { results } = await result;

    expect(results).toHaveLength(2);
    expect(results.every((r: SyncResult) => r.ok)).toBe(true);
    expect(mockApi.updateAccount).toHaveBeenCalledTimes(2);
  });

  it("records failed entries individually", async () => {
    mockApi.updateAccount
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("not found"));
    const entries = [
      { plId: "acc-1", balance: 1000, name: "IRA" },
      { plId: "acc-bad", balance: 500, name: "Bad" },
    ];

    const result = waitForResult("sync-2");
    dispatch("pl-ext-sync-entries", { id: "sync-2", entries, apiKey: "key" });
    const { results } = await result;

    expect(results.find((r: SyncResult) => r.name === "IRA")?.ok).toBe(true);
    expect(results.find((r: SyncResult) => r.name === "Bad")?.ok).toBe(false);
  });

  it("returns error when plugin API is missing", async () => {
    (window as any).projectionlabPluginAPI = undefined;

    const result = waitForResult("sync-3");
    dispatch("pl-ext-sync-entries", {
      id: "sync-3",
      entries: [],
      apiKey: "key",
    });
    expect((await result).error).toMatch(/not found/i);
  });
});
