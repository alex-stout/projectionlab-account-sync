import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountRow from "./AccountRow";
import type { Account, PlAccount } from "../types";

const account: Account = { name: "IRA", balance: 12500, rateOfReturn: null, accountId: null };
const plAccounts: PlAccount[] = [
  { id: "pl-1", name: "Retirement IRA" },
  { id: "pl-2", name: "Brokerage" },
];

describe("AccountRow", () => {
  it("renders account name and formatted balance", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={[]} onChange={vi.fn()} />);
    expect(screen.getByText("IRA")).toBeInTheDocument();
    expect(screen.getByText("$12,500")).toBeInTheDocument();
  });

  it("renders PL account options in the select", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={plAccounts} onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Retirement IRA" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Brokerage" })).toBeInTheDocument();
  });

  it("shows the currently mapped PL account as selected", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="pl-1" plAccounts={plAccounts} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveValue("pl-1");
  });

  it("shows Not mapped option when no mapping", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={plAccounts} onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Not mapped" })).toBeInTheDocument();
  });

  it("shows load prompt option when plAccounts is empty", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "↻ Load PL accounts" })).toBeInTheDocument();
  });

  it("disables select when plAccounts is empty", () => {
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("calls onChange with key and selected value on change", () => {
    const onChange = vi.fn();
    render(<AccountRow accountKey="IRA" account={account} mapped="" plAccounts={plAccounts} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pl-2" } });
    expect(onChange).toHaveBeenCalledWith("IRA", "pl-2");
  });
});
