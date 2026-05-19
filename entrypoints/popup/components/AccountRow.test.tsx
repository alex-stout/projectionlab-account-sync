import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, PlAccount } from "~/types";
import AccountRow from "./AccountRow";

const account: Account = {
	name: "IRA",
	balance: 12500,
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
			screen.getByRole("option", { name: "Load in Settings" }),
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

	it("shows a hint when the mapped PL account is also mapped from other sources", () => {
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapped="pl-1"
				plAccounts={plAccounts}
				otherSources={["YNAB", "Alight"]}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByText(/also from YNAB, Alight/)).toBeInTheDocument();
	});

	it("does not show the cross-source hint when otherSources is empty", () => {
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapped="pl-1"
				plAccounts={plAccounts}
				otherSources={[]}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.queryByText(/also from/)).not.toBeInTheDocument();
	});

	it("does not show the cross-source hint when row is unmapped", () => {
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapped=""
				plAccounts={plAccounts}
				otherSources={["YNAB"]}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.queryByText(/also from/)).not.toBeInTheDocument();
	});

	it("offers a 'Split into multiple' affordance when PL accounts are loaded and row is single-mapped", () => {
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapped="pl-1"
				plAccounts={plAccounts}
				onChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("button", { name: /split into multiple/i }),
		).toBeInTheDocument();
	});

	it("does not offer the split affordance until PL accounts are loaded", () => {
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
			screen.queryByRole("button", { name: /split into multiple/i }),
		).not.toBeInTheDocument();
	});

	it("seeds a split with the current mapping when the user clicks split", () => {
		const onChange = vi.fn();
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapped="pl-1"
				plAccounts={plAccounts}
				onChange={onChange}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /split into multiple/i }),
		);
		expect(onChange).toHaveBeenCalledWith("IRA", {
			splits: [{ plId: "pl-1", mode: "percent", value: 100 }],
		});
	});

	it("renders the split editor instead of the select when mapping is a SplitMapping", () => {
		render(
			<AccountRow
				accountKey="IRA"
				account={account}
				mapping={{
					splits: [
						{ plId: "pl-1", mode: "percent", value: 60 },
						{ plId: "pl-2", mode: "remainder" },
					],
				}}
				mapped=""
				plAccounts={plAccounts}
				onChange={vi.fn()}
			/>,
		);
		// The flat single-select is gone (would have included a "Not mapped" option).
		expect(
			screen.queryByRole("option", { name: "Not mapped" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: /split leg 1 pl account/i }),
		).toHaveValue("pl-1");
		expect(
			screen.getByRole("combobox", { name: /split leg 2 pl account/i }),
		).toHaveValue("pl-2");
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
		expect(
			screen.getByRole("option", { name: "Not mapped" }),
		).toBeInTheDocument();
	});
});
