import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlTab, getSourceTab } from "./background";
import bgSetup from "./background";

const mockTab = { id: 1, url: "https://app.projectionlab.com/" };

// Register the listener once
(bgSetup as any)();

const handler: (msg: any, sender: any, sendResponse: any) => any = vi.mocked(
  browser.runtime.onMessage.addListener,
).mock.calls[0][0] as any;

// Handler returns `true` for Chrome MV3; result is delivered via sendResponse callback
const call = (msg: any) => new Promise<any>(resolve => { handler(msg, {}, resolve); });

beforeEach(() => {
  vi.mocked(browser.tabs.query).mockReset();
  vi.mocked(browser.tabs.sendMessage as any).mockReset();
  vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({ plApiKey: "test-key" } as any);
  vi.mocked(browser.storage.local.set as any).mockReset().mockResolvedValue(undefined);
});

describe("getPlTab", () => {
  it("returns the first matching PL tab", async () => {
    vi.mocked(browser.tabs.query)
      .mockResolvedValueOnce([mockTab] as any)
      .mockResolvedValue([] as any);
    expect(await getPlTab()).toEqual(mockTab);
  });

  it("tries all PL URLs and returns null if none open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    expect(await getPlTab()).toBeNull();
    expect(browser.tabs.query).toHaveBeenCalledTimes(2);
  });

  it("returns tab from ea URL if app URL has none", async () => {
    vi.mocked(browser.tabs.query)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([mockTab] as any);
    expect(await getPlTab()).toEqual(mockTab);
  });
});

describe("getSourceTab", () => {
  it("returns null for unknown plugin", async () => {
    expect(await getSourceTab("unknown-plugin")).toBeNull();
  });

  it("returns tab for vanguard when open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    expect(await getSourceTab("vanguard")).toEqual(mockTab);
  });

  it("returns null when vanguard tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    expect(await getSourceTab("vanguard")).toBeNull();
  });

  it("returns tab for alight when open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    expect(await getSourceTab("alight")).toEqual(mockTab);
  });
});

describe("SYNC_SOURCE", () => {
  it("returns error when tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(result.error).toMatch(/not open/i);
  });

  it("sends SYNC_REQUEST and returns accounts from tab response", async () => {
    const payload = [{ name: "IRA", balance: 5000, accountId: null }];
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ ok: true, payload });
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, { type: "SYNC_REQUEST" });
    expect(result.ok).toBe(true);
    expect(result.accounts).toEqual(payload);
  });

  it("writes accounts and lastRefreshed to storage on success", async () => {
    const payload = [{ name: "IRA", balance: 5000, accountId: null }];
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ ok: true, payload });
    await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ accounts_vanguard: payload, lastRefreshed_vanguard: expect.any(Number) })
    );
  });

  it("returns error when tab response is falsy", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue(null);
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(result.error).toMatch(/failed to read/i);
  });

  it("propagates the tab's specific error message when ok is false", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({
      ok: false,
      error: "No accounts found on this page. Please open an issue.",
    });
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(result.error).toBe("No accounts found on this page. Please open an issue.");
  });

  it("returns error when tabs.sendMessage throws", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockRejectedValue(new Error("disconnected"));
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(result.error).toMatch(/failed to read/i);
  });

  it("returns not-open error when getSourceTab throws", async () => {
    vi.mocked(browser.tabs.query).mockRejectedValue(new Error("permission denied"));
    const result = await call({ type: "SYNC_SOURCE", sourceId: "vanguard" });
    expect(result.error).toMatch(/not open/i);
  });

  it("returns error for unknown plugin", async () => {
    const result = await call({ type: "SYNC_SOURCE", sourceId: "unknown" });
    expect(result.error).toMatch(/unknown/i);
  });
});

describe("SYNC_SOURCE (api plugin)", () => {
  it("returns error when credentials are missing", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    const result = await call({ type: "SYNC_SOURCE", sourceId: "ynab" });
    expect(result.error).toMatch(/credentials/i);
  });

  it("calls plugin.refresh with creds and writes accounts on success", async () => {
    const ynabAccounts = [
      { id: "a-1", name: "Checking", balance: 1_234_000, closed: false, deleted: false },
    ];
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      creds_ynab: { accessToken: "tok-123" },
    } as any);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { accounts: ynabAccounts } }),
    }) as any;

    const result = await call({ type: "SYNC_SOURCE", sourceId: "ynab" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.ynab.com/v1/budgets/last-used/accounts",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.accounts).toEqual([
      { name: "Checking", balance: 1234, accountId: "a-1" },
    ]);
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts_ynab: result.accounts,
        lastRefreshed_ynab: expect.any(Number),
      }),
    );
  });

  it("returns error message when refresh throws", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      creds_ynab: { accessToken: "bad-tok" },
    } as any);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    }) as any;

    const result = await call({ type: "SYNC_SOURCE", sourceId: "ynab" });
    expect(result.error).toMatch(/rejected the access token/i);
  });

  it("returns a generic error when refresh throws a non-Error value", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      creds_ynab: { accessToken: "tok" },
    } as any);
    // A string rejection triggers the `e instanceof Error ? ... : ...` false branch.
    global.fetch = vi.fn().mockRejectedValue("network-down") as any;

    const result = await call({ type: "SYNC_SOURCE", sourceId: "ynab" });
    expect(result.error).toMatch(/failed to fetch from ynab/i);
  });
});

describe("FETCH_PL_ACCOUNTS", () => {
  it("returns error when no API key is set", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    const result = await call({ type: "FETCH_PL_ACCOUNTS" });
    expect(result.error).toMatch(/no api key/i);
  });

  it("returns error when PL tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await call({ type: "FETCH_PL_ACCOUNTS" });
    expect(result.error).toMatch(/not open/i);
  });

  it("forwards to PL tab and returns result", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ accounts: [] });
    const result = await call({ type: "FETCH_PL_ACCOUNTS" });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
      mockTab.id,
      expect.objectContaining({ type: "FETCH_PL_ACCOUNTS" }),
    );
    expect(result).toEqual({ accounts: [] });
  });
});

describe("SYNC_TO_PL", () => {
  it("returns error when no API key is set", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(result.error).toMatch(/no api key/i);
  });

  it("returns error when PL tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(result.error).toMatch(/not open/i);
  });

  it("falls back to empty accounts when storage key missing", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({ plApiKey: "test-key" } as any);
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(result.error).toMatch(/no mapped/i);
  });

  it("falls back to empty mappings when mappings key missing", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
    } as any);
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(result.error).toMatch(/no mapped/i);
  });

  it("skips accounts with no mapping entry", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: {},
    } as any);
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(result.error).toMatch(/no mapped/i);
  });

  it("uses accountId as mapping key when present", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: "acc-123" }],
      mappings_vanguard: { "acc-123": "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ results: [{ name: "IRA", ok: true }] });
    await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
      mockTab.id,
      expect.objectContaining({ entries: [{ plId: "pl-uuid-1", balance: 5000, name: "IRA" }] }),
    );
  });

  it("sends mapped entries and sets lastSynced on success", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ results: [{ name: "IRA", ok: true }] });
    const result = await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSynced_vanguard: expect.any(Number) }),
    );
    expect(result.results[0].ok).toBe(true);
  });

  it("does not set lastSynced when result has an error", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ error: "PL rejected" });
    await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(browser.storage.local.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ lastSynced_vanguard: expect.any(Number) }),
    );
  });

  it("does not set lastSynced when result is falsy", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plApiKey: "test-key",
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue(null);
    await call({ type: "SYNC_TO_PL", sourceId: "vanguard" });
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  });
});

describe("unknown message type", () => {
  it("returns undefined for unrecognized messages", async () => {
    const result = await call({ type: "UNKNOWN" });
    expect(result).toBeUndefined();
  });
});
