import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import App from "./App";

const sourceAccounts = [{ name: "IRA", balance: 5000, rateOfReturn: null, accountId: null }];

beforeEach(() => {
  vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({} as any);
  vi.mocked(browser.storage.local.set as any).mockReset().mockResolvedValue(undefined);
  vi.mocked(browser.runtime.sendMessage).mockReset().mockResolvedValue(undefined as any);
  vi.mocked(browser.tabs.query).mockReset().mockResolvedValue([] as any);
});

describe("App", () => {
  it("renders the sidebar and ProjectionLab label on mount", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("PL Sync")).toBeInTheDocument());
    expect(screen.getByText("ProjectionLab")).toBeInTheDocument();
  });

  it("switches active plugin when sidebar button is clicked", async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle("Alight"));
    await act(async () => { fireEvent.click(screen.getByTitle("Alight")); });
    expect(screen.getAllByText("Alight").length).toBeGreaterThan(0);
  });

  it("loads persisted plAccounts and source accounts from storage", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plAccounts: [{ id: "pl-1", name: "Retirement IRA" }],
      accounts_vanguard: sourceAccounts,
    } as any);
    render(<App />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Retirement IRA" })).toBeInTheDocument());
  });

  it("marks plugin as available when a matching tab is open", async () => {
    vi.mocked(browser.tabs.query).mockResolvedValue([{ id: 1 }] as any);
    render(<App />);
    await waitFor(() => {
      const btn = screen.getByTitle("Vanguard");
      expect(btn.querySelector(".bg-indigo-200, .bg-green-400")).toBeInTheDocument();
    });
  });

  it("sends FETCH_PL_ACCOUNTS and stores returned accounts on PL refresh", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ accounts_vanguard: sourceAccounts } as any);
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({
      accounts: [{ id: "pl-1", name: "Brokerage" }],
    } as any);
    render(<App />);
    await waitFor(() => screen.getByText("↻ ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("↻ ProjectionLab")); });
    await waitFor(() => expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ plAccounts: [{ id: "pl-1", name: "Brokerage" }] })
    ));
    expect(screen.getByRole("option", { name: "Brokerage" })).toBeInTheDocument();
  });

  it("loads lastSynced from storage and shows timestamp in sidebar", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ lastSynced_vanguard: Date.now() } as any);
    render(<App />);
    await waitFor(() =>
      expect(within(screen.getByTitle("Vanguard")).getByText("just now")).toBeInTheDocument()
    );
  });

  it("loads lastRefreshed from storage and shows timestamp in panel header", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ lastRefreshed_vanguard: Date.now() } as any);
    render(<App />);
    await waitFor(() => expect(screen.getByText("just now")).toBeInTheDocument());
  });

  it("handleSynced updates sidebar timestamp after successful sync", async () => {
    vi.mocked(browser.storage.local.get).mockImplementation((keys: any) => {
      const arr: string[] = Array.isArray(keys) ? keys : [keys];
      const result: any = {};
      if (arr.includes("accounts_vanguard"))
        result.accounts_vanguard = [{ name: "IRA", balance: 5000, rateOfReturn: null, accountId: null }];
      if (arr.includes("mappings_vanguard"))
        result.mappings_vanguard = { IRA: "pl-1" };
      return Promise.resolve(result);
    });
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ results: [{ name: "IRA", ok: true }] } as any);
    render(<App />);
    await waitFor(() => screen.getByText("Sync to ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("Sync to ProjectionLab")); });
    await waitFor(() =>
      expect(within(screen.getByTitle("Vanguard")).getByText("just now")).toBeInTheDocument()
    );
  });

  it("handleRefreshed updates panel header timestamp after source refresh", async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ ok: true } as any);
    vi.mocked(browser.storage.local.get).mockImplementation((keys: any) => {
      const arr: string[] = Array.isArray(keys) ? keys : [keys];
      const result: any = {};
      if (arr.includes("accounts_vanguard")) result.accounts_vanguard = [];
      return Promise.resolve(result);
    });
    render(<App />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /↻ Vanguard/ })); });
    await waitFor(
      () => expect(screen.getByText("just now")).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("shows amber dot on gear button when no API key is stored", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    render(<App />);
    await waitFor(() => {
      const gear = screen.getByTitle("Settings");
      expect(gear.querySelector(".bg-amber-400")).toBeInTheDocument();
    });
  });

  it("does not show amber dot on gear button when API key is stored", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ plApiKey: "my-key" } as any);
    render(<App />);
    await waitFor(() => {
      const gear = screen.getByTitle("Settings");
      expect(gear.querySelector(".bg-amber-400")).not.toBeInTheDocument();
    });
  });

  it("switches to settings view when gear button is clicked", async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle("Settings"));
    await act(async () => { fireEvent.click(screen.getByTitle("Settings")); });
    expect(screen.getByText("ProjectionLab API Key")).toBeInTheDocument();
  });

  it("returns to main view when gear is clicked again", async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle("Settings"));
    await act(async () => { fireEvent.click(screen.getByTitle("Settings")); });
    expect(screen.getByText("ProjectionLab API Key")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByTitle("Settings")); });
    expect(screen.queryByText("ProjectionLab API Key")).not.toBeInTheDocument();
    expect(screen.getByText("ProjectionLab")).toBeInTheDocument();
  });

  it("returns to main view when plugin button is clicked from settings", async () => {
    render(<App />);
    await waitFor(() => screen.getByTitle("Settings"));
    await act(async () => { fireEvent.click(screen.getByTitle("Settings")); });
    await act(async () => { fireEvent.click(screen.getByTitle("Vanguard")); });
    expect(screen.queryByText("ProjectionLab API Key")).not.toBeInTheDocument();
  });

  it("removes amber dot after API key is saved in settings panel", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    render(<App />);
    await waitFor(() => screen.getByTitle("Settings"));
    await act(async () => { fireEvent.click(screen.getByTitle("Settings")); });
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "new-key" },
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    await waitFor(() => {
      const gear = screen.getByTitle("Settings");
      expect(gear.querySelector(".bg-amber-400")).not.toBeInTheDocument();
    });
  });

  it("shows plError banner when FETCH_PL_ACCOUNTS returns an error", async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "No API key set. Open extension settings." } as any);
    render(<App />);
    await waitFor(() => screen.getByText("↻ ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("↻ ProjectionLab")); });
    await waitFor(() => expect(screen.getByText(/no api key set/i)).toBeInTheDocument());
  });

  it("clears plError when plugin is switched", async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "No API key set. Open extension settings." } as any);
    render(<App />);
    await waitFor(() => screen.getByText("↻ ProjectionLab"));
    await act(async () => { fireEvent.click(screen.getByText("↻ ProjectionLab")); });
    await waitFor(() => screen.getByText(/no api key set/i));
    await act(async () => { fireEvent.click(screen.getByTitle("Alight")); });
    expect(screen.queryByText(/no api key set/i)).not.toBeInTheDocument();
  });

  it("does not update plAccounts when response has no accounts field", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({
      plAccounts: [{ id: "pl-1", name: "Existing" }],
      accounts_vanguard: sourceAccounts,
    } as any);
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ error: "not open" } as any);
    render(<App />);
    await waitFor(() => screen.getByRole("option", { name: "Existing" }));
    await act(async () => { fireEvent.click(screen.getByText("↻ ProjectionLab")); });
    expect(screen.getByRole("option", { name: "Existing" })).toBeInTheDocument();
    expect(browser.storage.local.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ plAccounts: expect.anything() })
    );
  });
});
