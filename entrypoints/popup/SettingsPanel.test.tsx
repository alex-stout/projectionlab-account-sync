import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SettingsPanel from "./SettingsPanel";

beforeEach(() => {
  vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({} as any);
  vi.mocked(browser.storage.local.set as any).mockReset().mockResolvedValue(undefined);
  vi.mocked((browser.storage.local as any).remove).mockReset().mockResolvedValue(undefined);
});

describe("SettingsPanel", () => {
  it("renders API key input and Save button", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/paste your api key/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("loads existing API key from storage on mount", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ plApiKey: "existing-key" } as any);
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/paste your api key/i)).toHaveValue("existing-key")
    );
  });

  it("Save button is disabled when input is empty", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("Save button is enabled when input has text", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("saves key to storage and calls onKeyChange(true) on save", async () => {
    const onKeyChange = vi.fn();
    render(<SettingsPanel onKeyChange={onKeyChange} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-api-key" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({ plApiKey: "my-api-key" });
    expect(onKeyChange).toHaveBeenCalledWith(true);
  });

  it("trims whitespace from key before saving", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "  my-key  " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({ plApiKey: "my-key" });
  });

  it("shows '✓ Saved' feedback after saving", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(screen.getByRole("button", { name: /✓ Saved/ })).toBeInTheDocument();
  });

  it("resets '✓ Saved' feedback when key is modified after save", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key-2" },
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /✓ Saved/ })).not.toBeInTheDocument();
  });

  it("shows Clear button only when input has a value", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "key" },
    });
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("clears key from storage and calls onKeyChange(false) on clear", async () => {
    const onKeyChange = vi.fn();
    vi.mocked(browser.storage.local.get).mockResolvedValue({ plApiKey: "old-key" } as any);
    render(<SettingsPanel onKeyChange={onKeyChange} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    });
    expect((browser.storage.local as any).remove).toHaveBeenCalledWith("plApiKey");
    expect(onKeyChange).toHaveBeenCalledWith(false);
    expect(screen.getByPlaceholderText(/paste your api key/i)).toHaveValue("");
  });

  it("renders the Clear All Data button", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Clear All Data" })).toBeInTheDocument();
  });

  it("removes accounts, mappings, and timestamps for all plugins on clear data", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });
    expect((browser.storage.local as any).remove).toHaveBeenCalledWith(
      expect.arrayContaining([
        "plAccounts",
        "accounts_vanguard",
        "mappings_vanguard",
        "lastSynced_vanguard",
        "lastRefreshed_vanguard",
      ])
    );
  });

  it("calls onDataCleared callback after clearing data", async () => {
    const onDataCleared = vi.fn();
    render(<SettingsPanel onKeyChange={vi.fn()} onDataCleared={onDataCleared} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });
    expect(onDataCleared).toHaveBeenCalledOnce();
  });

  it("shows '✓ Cleared' feedback after clearing data", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });
    expect(screen.getByRole("button", { name: "✓ Cleared" })).toBeInTheDocument();
  });

  it("hides Clear button after clearing", async () => {
    vi.mocked(browser.storage.local.get).mockResolvedValue({ plApiKey: "old-key" } as any);
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    });
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});
