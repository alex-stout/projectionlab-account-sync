import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
    await waitFor(() => expect(screen.getByText("PL")).toBeInTheDocument());
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
