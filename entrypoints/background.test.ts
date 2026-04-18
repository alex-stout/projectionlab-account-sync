import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlTab, getSourceTab } from "./background";
import bgSetup from "./background";

const mockTab = { id: 1, url: "https://app.projectionlab.com/" };

// Register the listener once
(bgSetup as any)();

const handler: (msg: any, sender: any, sendResponse: any) => any = vi.mocked(
  browser.runtime.onMessage.addListener,
).mock.calls[0][0] as any;

beforeEach(() => {
  vi.mocked(browser.tabs.query).mockReset();
  vi.mocked(browser.tabs.sendMessage as any).mockReset();
  vi.mocked(browser.storage.local.get).mockReset();
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
    expect(browser.tabs.query).toHaveBeenCalledTimes(3);
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

describe("SYNC_DATA", () => {
  it("stores payload and sets lastRefreshed", async () => {
    const result = await handler(
      {
        type: "SYNC_DATA",
        sourceId: "vanguard",
        payload: [{ name: "IRA", balance: 1000 }],
      },
      {},
      () => {},
    );
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts_vanguard: [{ name: "IRA", balance: 1000 }],
      }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("SYNC_SOURCE", () => {
  it("returns error when tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await handler(
      { type: "SYNC_SOURCE", sourceId: "vanguard" },
      {},
      () => {},
    );
    expect(result.error).toMatch(/not open/i);
  });

  it("sends SYNC_REQUEST to source tab", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({});
    const result = await handler(
      { type: "SYNC_SOURCE", sourceId: "vanguard" },
      {},
      () => {},
    );
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
      type: "SYNC_REQUEST",
    });
    expect(result.ok).toBe(true);
  });

  it("returns error for unknown plugin", async () => {
    const result = await handler(
      { type: "SYNC_SOURCE", sourceId: "unknown" },
      {},
      () => {},
    );
    expect(result.error).toMatch(/unknown/i);
  });
});

describe("FETCH_PL_ACCOUNTS", () => {
  it("returns error when PL tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await handler({ type: "FETCH_PL_ACCOUNTS" }, {}, () => {});
    expect(result.error).toMatch(/not open/i);
  });

  it("forwards to PL tab and returns result", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({
      accounts: [],
    });
    const result = await handler({ type: "FETCH_PL_ACCOUNTS" }, {}, () => {});
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
      mockTab.id,
      expect.objectContaining({ type: "FETCH_PL_ACCOUNTS" }),
    );
    expect(result).toEqual({ accounts: [] });
  });
});

describe("SYNC_TO_PL", () => {
  it("returns error when PL tab is not open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([] as any);
    const result = await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(result.error).toMatch(/not open/i);
  });

  it("falls back to empty accounts when storage key missing", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    const result = await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(result.error).toMatch(/no mapped/i);
  });

  it("falls back to empty mappings when mappings key missing", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
    } as any);
    const result = await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(result.error).toMatch(/no mapped/i);
  });

  it("skips accounts with no mapping entry", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: {},
    } as any);
    const result = await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(result.error).toMatch(/no mapped/i);
  });

  it("uses accountId as mapping key when present", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: "acc-123" }],
      mappings_vanguard: { "acc-123": "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ results: [{ name: "IRA", ok: true }] });
    await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
      mockTab.id,
      expect.objectContaining({ entries: [{ plId: "pl-uuid-1", balance: 5000, name: "IRA" }] }),
    );
  });

  it("sends mapped entries and sets lastSynced on success", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ results: [{ name: "IRA", ok: true }] });
    const result = await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSynced_vanguard: expect.any(Number) }),
    );
    expect(result.results[0].ok).toBe(true);
  });

  it("does not set lastSynced when result has an error", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue({ error: "PL rejected" });
    await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(browser.storage.local.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ lastSynced_vanguard: expect.any(Number) }),
    );
  });

  it("does not set lastSynced when result is falsy", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValueOnce([mockTab] as any);
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: [{ name: "IRA", balance: 5000, accountId: null }],
      mappings_vanguard: { IRA: "pl-uuid-1" },
    } as any);
    vi.mocked(browser.tabs.sendMessage as any).mockResolvedValue(null);
    await handler({ type: "SYNC_TO_PL", sourceId: "vanguard" }, {}, () => {});
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  });
});

describe("unknown message type", () => {
  it("returns undefined for unrecognized messages", async () => {
    const result = await handler({ type: "UNKNOWN" }, {}, () => {});
    expect(result).toBeUndefined();
  });
});
