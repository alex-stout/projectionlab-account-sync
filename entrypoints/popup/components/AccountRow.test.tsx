import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountRow from "./AccountRow";
import type { Account, PlAccount } from "~/types";

const account: Account = {
  name: "IRA",
  balance: 12500,
  rateOfReturn: null,
  accountId: null,
};
const plAccounts: PlAccount[] = [
  { id: "pl-1", name: "Retirement IRA" },
  { id: "pl-2", name: "Brokerage" },
];

describe("AccountRow", () => {
  it("renders account name and formatted balance", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("IRA")).toBeInTheDocument();
    expect(screen.getByText("$12,500")).toBeInTheDocument();
  });

  it("renders PL account options in the select", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("option", { name: "Retirement IRA" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Brokerage" }),
    ).toBeInTheDocument();
  });

  it("shows the currently mapped PL account as selected", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped="pl-1"
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("pl-1");
  });

  it("shows Not mapped option when no mapping", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("option", { name: "Not mapped" }),
    ).toBeInTheDocument();
  });

  it("shows load prompt option when plAccounts is empty", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={[]}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("option", { name: "↻ Load PL accounts" }),
    ).toBeInTheDocument();
  });

  it("disables select when plAccounts is empty", () => {
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("calls onChange with key and selected value on change", () => {
    const onChange = vi.fn();
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped=""
        plAccounts={plAccounts}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "pl-2" },
    });
    expect(onChange).toHaveBeenCalledWith("IRA", "pl-2");
  });

  it("renders with negative balance (e.g. debts) without crashing", () => {
    render(
      <AccountRow
        accountKey="Mortgage"
        account={{
          name: "Mortgage",
          balance: -250_000,
          rateOfReturn: null,
          accountId: null,
        }}
        mapped=""
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("-$250,000")).toBeInTheDocument();
  });

  it("renders an overly long account name with the truncate class applied", () => {
    const longName =
      "This Is An Extremely Long Brokerage Account Name That Should Truncate";
    render(
      <AccountRow
        accountKey={longName}
        account={{
          name: longName,
          balance: 1000,
          rateOfReturn: null,
          accountId: null,
        }}
        mapped=""
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    const nameEl = screen.getByText(longName);
    expect(nameEl).toBeInTheDocument();
    expect(nameEl.className).toMatch(/truncate/);
  });

  it("pins behavior for a stale mapping referencing a deleted PL account", () => {
    // User deleted 'pl-deleted' in ProjectionLab but the mapping is still in storage.
    // Pins the current (silent) behavior so a future change to surface a warning
    // about dead mappings is a conscious decision.
    render(
      <AccountRow
        accountKey="IRA"
        account={account}
        mapped="pl-deleted"
        plAccounts={plAccounts}
        onChange={vi.fn()}
      />,
    );
    // No option matches the stale mapping — user sees no highlighted account name.
    expect(
      screen.queryByRole("option", { name: "pl-deleted" }),
    ).not.toBeInTheDocument();
    // Real options are still offered for recovery.
    expect(
      screen.getByRole("option", { name: "Retirement IRA" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Not mapped" })).toBeInTheDocument();
  });
});
