import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SourcePanel from "./SourcePanel";
import type { SourcePlugin } from "~/plugins";

const plugin: SourcePlugin = {
  id: "vanguard",
  name: "Vanguard",
  icon: "/v.png",
  urlPatterns: ["https://vanguard.com/*"],
};

const plAccounts = [{ id: "pl-1", name: "Retirement IRA" }];

const accounts = [
  { name: "IRA", balance: 5000, rateOfReturn: null, accountId: null },
];

const defaults = {
  plugin,
  plAccounts: [],
  plLoading: false,
  lastRefreshed: null,
  onRefreshPL: vi.fn(),
  onSynced: vi.fn(),
  onRefreshed: vi.fn(),
};

beforeEach(() => {
  vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({} as any);
  vi.mocked(browser.storage.local.set as any).mockReset().mockResolvedValue(undefined);
  vi.mocked(browser.runtime.sendMessage).mockReset().mockResolvedValue(undefined as any);
  defaults.onSynced = vi.fn();
  defaults.onRefreshed = vi.fn();
  defaults.onRefreshPL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper: target the PanelHeader source-refresh button specifically
const getRefreshSourceBtn = () => screen.getByRole("button", { name: /↻ Vanguard/ });

describe("SourcePanel", () => {
  it("shows empty state when no accounts in storage", async () => {
    render(<SourcePanel {...defaults} />);
    await waitFor(() => expect(screen.getByText(/Open Vanguard/)).toBeInTheDocument());
  });

  it("loads and displays accounts from storage", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ accounts_vanguard: accounts } as any);
    render(<SourcePanel {...defaults} />);
    await waitFor(() => expect(screen.getByText("IRA")).toBeInTheDocument());
  });

  it("does not render SyncFooter when accounts are empty", async () => {
    render(<SourcePanel {...defaults} />);
    await waitFor(() => expect(screen.queryByText(/mapped/)).not.toBeInTheDocument());
  });

  it("renders SyncFooter when accounts are present", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ accounts_vanguard: accounts } as any);
    render(<SourcePanel {...defaults} plAccounts={plAccounts} />);
    await waitFor(() => expect(screen.getByText("0 of 1 mapped")).toBeInTheDocument());
  });

  it("shows loading state while refreshing source", async () => {
    vi.mocked(browser.runtime.sendMessage).mockImplementation(() => new Promise(() => {}));
    render(<SourcePanel {...defaults} />);
    fireEvent.click(getRefreshSourceBtn());
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when SYNC_SOURCE returns error", async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "Tab not open" } as any);
    render(<SourcePanel {...defaults} />);
    await act(async () => { fireEvent.click(getRefreshSourceBtn()); });
    expect(screen.getByText("Tab not open")).toBeInTheDocument();
  });

  it("loads accounts and calls onRefreshed after successful source refresh", async () => {
    vi.useFakeTimers();
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ ok: true } as any);
    vi.mocked(browser.storage.local.get)
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({ accounts_vanguard: accounts } as any);
    const onRefreshed = vi.fn();
    render(<SourcePanel {...defaults} onRefreshed={onRefreshed} />);
    await act(async () => { fireEvent.click(getRefreshSourceBtn()); });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(onRefreshed).toHaveBeenCalledOnce();
    expect(screen.getByText("IRA")).toBeInTheDocument();
  });

  it("saves updated mapping to storage on change", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: accounts,
      mappings_vanguard: {},
    } as any);
    render(<SourcePanel {...defaults} plAccounts={plAccounts} />);
    await waitFor(() => screen.getByRole("combobox"));
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "pl-1" } });
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({ mappings_vanguard: { IRA: "pl-1" } });
  });

  it("removes mapping when empty value selected", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: accounts,
      mappings_vanguard: { IRA: "pl-1" },
    } as any);
    render(<SourcePanel {...defaults} plAccounts={plAccounts} />);
    await waitFor(() => screen.getByRole("combobox"));
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({ mappings_vanguard: {} });
  });

  it("calls onSynced and shows results after successful sync", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: accounts,
      mappings_vanguard: { IRA: "pl-1" },
    } as any);
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ results: [{ name: "IRA", ok: true }] } as any);
    const onSynced = vi.fn();
    render(<SourcePanel {...defaults} plAccounts={plAccounts} onSynced={onSynced} />);
    await waitFor(() => screen.getByText("Sync to ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("Sync to ProjectionLab")); });
    await waitFor(() => expect(onSynced).toHaveBeenCalledOnce());
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows error state when sync returns error", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: accounts,
      mappings_vanguard: { IRA: "pl-1" },
    } as any);
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "PL not open" } as any);
    render(<SourcePanel {...defaults} plAccounts={plAccounts} />);
    await waitFor(() => screen.getByText("Sync to ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("Sync to ProjectionLab")); });
    await waitFor(() => expect(screen.getByText("PL not open")).toBeInTheDocument());
  });

  it("resets error state when plugin changes", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      accounts_vanguard: accounts,
      mappings_vanguard: { IRA: "pl-1" },
    } as any);
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "PL not open" } as any);
    const { rerender } = render(<SourcePanel {...defaults} plAccounts={plAccounts} />);
    await waitFor(() => screen.getByText("Sync to ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("Sync to ProjectionLab")); });
    await waitFor(() => screen.getByText("PL not open"));

    const alight: SourcePlugin = { id: "alight", name: "Alight", icon: "/a.png", urlPatterns: [] };
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    rerender(<SourcePanel {...defaults} plugin={alight} key="alight" />);
    await waitFor(() => expect(screen.queryByText("PL not open")).not.toBeInTheDocument());
  });
});
