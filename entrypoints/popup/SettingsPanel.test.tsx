import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SettingsPanel from "./SettingsPanel";

beforeEach(() => {
  vi.mocked(browser.storage.local.get).mockReset().mockResolvedValue({} as any);
  vi.mocked(browser.storage.local.set as any).mockReset().mockResolvedValue(undefined);
  vi.mocked((browser.storage.local as any).remove).mockReset().mockResolvedValue(undefined);
});

// Multiple "Save" buttons exist (PL key + per-plugin creds). PL section renders first.
const getPlSaveBtn = () => screen.getAllByRole("button", { name: /^Save$/ })[0];

describe("SettingsPanel", () => {
  it("renders API key input and Save button", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/paste your api key/i)).toBeInTheDocument();
    expect(getPlSaveBtn()).toBeInTheDocument();
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
    expect(getPlSaveBtn()).toBeDisabled();
  });

  it("Save button is enabled when input has text", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    expect(getPlSaveBtn()).not.toBeDisabled();
  });

  it("saves key to storage and calls onKeyChange(true) on save", async () => {
    const onKeyChange = vi.fn();
    render(<SettingsPanel onKeyChange={onKeyChange} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-api-key" },
    });
    await act(async () => {
      fireEvent.click(getPlSaveBtn());
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
      fireEvent.click(getPlSaveBtn());
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({ plApiKey: "my-key" });
  });

  it("shows '✓ Saved' feedback after saving", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    await act(async () => {
      fireEvent.click(getPlSaveBtn());
    });
    expect(screen.getByRole("button", { name: /✓ Saved/ })).toBeInTheDocument();
  });

  it("reverts '✓ Saved' to 'Save' after the 2s timer elapses", async () => {
    vi.useFakeTimers();
    try {
      render(<SettingsPanel onKeyChange={vi.fn()} />);
      fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
        target: { value: "my-key" },
      });
      await act(async () => {
        fireEvent.click(getPlSaveBtn());
      });
      expect(screen.getByRole("button", { name: /✓ Saved/ })).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2001);
      });
      expect(screen.queryByRole("button", { name: /✓ Saved/ })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reverts '✓ Cleared' to 'Clear All Data' after the 2s timer elapses", async () => {
    vi.useFakeTimers();
    try {
      render(<SettingsPanel onKeyChange={vi.fn()} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
      });
      expect(screen.getByRole("button", { name: "✓ Cleared" })).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2001);
      });
      expect(screen.queryByRole("button", { name: "✓ Cleared" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets '✓ Saved' feedback when key is modified after save", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key" },
    });
    await act(async () => {
      fireEvent.click(getPlSaveBtn());
    });
    fireEvent.change(screen.getByPlaceholderText(/paste your api key/i), {
      target: { value: "my-key-2" },
    });
    expect(getPlSaveBtn()).toBeInTheDocument();
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
        "plApiKey",
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

describe("SettingsPanel — ApiPluginCreds (YNAB)", () => {
  // Scope queries to the YNAB credentials section to avoid colliding with the PL key form.
  const getTokenInput = () => {
    const section = screen.getByText(/YNAB Credentials/i).parentElement!;
    return section.querySelector('input[type="password"]') as HTMLInputElement;
  };
  const getYnabSaveBtn = () => screen.getAllByRole("button", { name: /^Save$/ })[1];

  it("renders a YNAB Credentials section with a password input", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByText(/YNAB Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Access Token/i)).toBeInTheDocument();
    expect(getTokenInput()).toBeInTheDocument();
  });

  it("renders help text under the token input", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(screen.getByText(/Generate one in YNAB/i)).toBeInTheDocument();
  });

  it("Save button is disabled when token is empty", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    expect(getYnabSaveBtn()).toBeDisabled();
  });

  it("Save button is enabled when token has a value", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(getTokenInput(), { target: { value: "tok-123" } });
    expect(getYnabSaveBtn()).not.toBeDisabled();
  });

  it("does not show Clear button when no creds are entered", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    // Only the PL key area might have a Clear button; YNAB section shouldn't when empty.
    const section = screen.getByText(/YNAB Credentials/i).parentElement!;
    expect(section.querySelector("button")?.textContent).not.toBe("Clear");
  });

  it("shows Clear button once the token is filled", () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(getTokenInput(), { target: { value: "tok" } });
    const section = screen.getByText(/YNAB Credentials/i).parentElement!;
    const clearBtns = [...section.querySelectorAll("button")].filter(
      (b) => b.textContent === "Clear",
    );
    expect(clearBtns).toHaveLength(1);
  });

  it("loads existing YNAB creds from storage on mount", async () => {
    vi.mocked(browser.storage.local.get).mockImplementation((key: any) => {
      if (key === "creds_ynab")
        return Promise.resolve({ creds_ynab: { accessToken: "seeded-token" } } as any);
      return Promise.resolve({} as any);
    });
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await waitFor(() => expect(getTokenInput()).toHaveValue("seeded-token"));
  });

  it("saves YNAB creds and fires onCredsChange(true)", async () => {
    const onCredsChange = vi.fn();
    render(<SettingsPanel onKeyChange={vi.fn()} onCredsChange={onCredsChange} />);
    fireEvent.change(getTokenInput(), { target: { value: "tok-abc" } });
    await act(async () => {
      fireEvent.click(getYnabSaveBtn());
    });
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      creds_ynab: { accessToken: "tok-abc" },
    });
    expect(onCredsChange).toHaveBeenCalledWith("ynab", true);
  });

  it("shows '✓ Saved' feedback after saving YNAB creds", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(getTokenInput(), { target: { value: "tok-abc" } });
    await act(async () => {
      fireEvent.click(getYnabSaveBtn());
    });
    expect(screen.getAllByRole("button", { name: /✓ Saved/ }).length).toBeGreaterThan(0);
  });

  it("reverts YNAB '✓ Saved' to 'Save' after the 2s timer elapses", async () => {
    vi.useFakeTimers();
    try {
      render(<SettingsPanel onKeyChange={vi.fn()} />);
      fireEvent.change(getTokenInput(), { target: { value: "tok-abc" } });
      await act(async () => {
        fireEvent.click(getYnabSaveBtn());
      });
      expect(screen.getAllByRole("button", { name: /✓ Saved/ }).length).toBeGreaterThan(0);
      await act(async () => {
        vi.advanceTimersByTime(2001);
      });
      expect(screen.queryAllByRole("button", { name: /✓ Saved/ })).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets '✓ Saved' feedback when the token is edited after save", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    fireEvent.change(getTokenInput(), { target: { value: "tok-abc" } });
    await act(async () => {
      fireEvent.click(getYnabSaveBtn());
    });
    expect(screen.getAllByRole("button", { name: /✓ Saved/ }).length).toBeGreaterThan(0);

    fireEvent.change(getTokenInput(), { target: { value: "tok-xyz" } });
    // After edit, the YNAB button should be back to "Save", so only 0 or 1 "Saved" buttons remain
    const savedCount = screen.queryAllByRole("button", { name: /^✓ Saved$/ }).length;
    expect(savedCount).toBe(0);
  });

  it("clears YNAB creds and fires onCredsChange(false)", async () => {
    const onCredsChange = vi.fn();
    vi.mocked(browser.storage.local.get).mockImplementation((key: any) => {
      if (key === "creds_ynab")
        return Promise.resolve({ creds_ynab: { accessToken: "seeded" } } as any);
      return Promise.resolve({} as any);
    });
    render(<SettingsPanel onKeyChange={vi.fn()} onCredsChange={onCredsChange} />);
    await waitFor(() => expect(getTokenInput()).toHaveValue("seeded"));

    const section = screen.getByText(/YNAB Credentials/i).parentElement!;
    const clearBtn = [...section.querySelectorAll("button")].find(
      (b) => b.textContent === "Clear",
    )!;
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect((browser.storage.local as any).remove).toHaveBeenCalledWith("creds_ynab");
    expect(onCredsChange).toHaveBeenCalledWith("ynab", false);
    expect(getTokenInput()).toHaveValue("");
  });

  it("fires onCredsChange(false) for each API plugin when Clear All Data is clicked", async () => {
    const onCredsChange = vi.fn();
    render(<SettingsPanel onKeyChange={vi.fn()} onCredsChange={onCredsChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });
    expect(onCredsChange).toHaveBeenCalledWith("ynab", false);
  });

  it("includes creds_ynab in the storage.remove call on Clear All Data", async () => {
    render(<SettingsPanel onKeyChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });
    expect((browser.storage.local as any).remove).toHaveBeenCalledWith(
      expect.arrayContaining(["creds_ynab"]),
    );
  });

  it("Clear All Data resets the visible YNAB token input even if creds were loaded", async () => {
    // Seed both PL key and YNAB creds so inputs start populated.
    vi.mocked(browser.storage.local.get).mockImplementation((key: any) => {
      if (key === "plApiKey") return Promise.resolve({ plApiKey: "pl-key" } as any);
      if (key === "creds_ynab")
        return Promise.resolve({ creds_ynab: { accessToken: "tok-abc" } } as any);
      return Promise.resolve({} as any);
    });
    render(<SettingsPanel onKeyChange={vi.fn()} />);

    await waitFor(() => expect(getTokenInput()).toHaveValue("tok-abc"));

    // After Clear All Data, the storage mock returns empty so the remount
    // picks up no creds — input should clear in the UI.
    vi.mocked(browser.storage.local.get).mockResolvedValue({} as any);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All Data" }));
    });

    await waitFor(() => expect(getTokenInput()).toHaveValue(""));
  });
});
