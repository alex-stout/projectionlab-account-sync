import { describe, it, expect, vi, beforeEach } from "vitest";
import plugin, { refresh } from "./index";

const okResponse = (accounts: unknown[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ data: { accounts } }),
});

beforeEach(() => {
  (global as any).fetch = vi.fn();
});

describe("YNAB plugin metadata", () => {
  it("exports an api plugin with credentials", () => {
    expect(plugin.id).toBe("ynab");
    expect(plugin.kind).toBe("api");
    if (plugin.kind === "api") {
      expect(plugin.credentials.some((c) => c.key === "accessToken")).toBe(true);
    }
  });
});

describe("YNAB refresh", () => {
  it("throws when the access token is missing", async () => {
    await expect(refresh({})).rejects.toThrow(/not set/i);
  });

  it("throws when the access token is whitespace-only", async () => {
    await expect(refresh({ accessToken: "   " })).rejects.toThrow(/not set/i);
  });

  it("sends Bearer auth and returns mapped accounts", async () => {
    (global as any).fetch = vi
      .fn()
      .mockResolvedValue(
        okResponse([
          { id: "a-1", name: "Checking", balance: 1_234_000, closed: false, deleted: false },
          { id: "a-2", name: "Savings", balance: 10_000_000, closed: false, deleted: false },
        ]),
      );
    const accounts = await refresh({ accessToken: "tok-abc" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.ynab.com/v1/budgets/last-used/accounts",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-abc" }),
      }),
    );
    expect(accounts).toEqual([
      { name: "Checking", balance: 1234, rateOfReturn: null, accountId: "a-1" },
      { name: "Savings", balance: 10_000, rateOfReturn: null, accountId: "a-2" },
    ]);
  });

  it("filters out closed and deleted accounts", async () => {
    (global as any).fetch = vi.fn().mockResolvedValue(
      okResponse([
        { id: "a-1", name: "Open", balance: 1000, closed: false, deleted: false },
        { id: "a-2", name: "Closed", balance: 2000, closed: true, deleted: false },
        { id: "a-3", name: "Deleted", balance: 3000, closed: false, deleted: true },
      ]),
    );
    const accounts = await refresh({ accessToken: "tok" });
    expect(accounts.map((a) => a.name)).toEqual(["Open"]);
  });

  it("handles an empty response gracefully", async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await expect(refresh({ accessToken: "tok" })).resolves.toEqual([]);
  });

  it("throws a specific error on 401", async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });
    await expect(refresh({ accessToken: "bad" })).rejects.toThrow(
      /rejected the access token/i,
    );
  });

  it("throws a generic error on other non-OK responses", async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    });
    await expect(refresh({ accessToken: "tok" })).rejects.toThrow(
      /500 Server Error/,
    );
  });
});
