import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IGNORE_PL_ID } from "~/lib/mapping";
import type { Account, PlAccount, SplitMapping } from "~/types";
import SplitEditor from "./SplitEditor";

const account: Account = { name: "401k", balance: 10_000, accountId: "v-1" };
const plAccounts: PlAccount[] = [
	{ id: "pl-roth", name: "Roth IRA" },
	{ id: "pl-trad", name: "Traditional IRA" },
];

const splitWith = (legs: SplitMapping["splits"]): SplitMapping => ({
	splits: legs,
});

describe("SplitEditor", () => {
	it("shows one row per leg", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "percent", value: 40 },
				])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("combobox", { name: /split leg 1 pl account/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: /split leg 2 pl account/i }),
		).toBeInTheDocument();
	});

	it("calls onChange with an extra leg when 'Add leg' is clicked", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 100 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /add target/i }));
		expect(onChange).toHaveBeenCalledWith({
			splits: [
				{ plId: "pl-roth", mode: "percent", value: 100 },
				{ plId: "", mode: "percent", value: 0 },
			],
		});
	});

	it("calls onChange with the leg removed when its × is clicked", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "percent", value: 40 },
				])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /remove split leg 1/i }),
		);
		expect(onChange).toHaveBeenCalledWith({
			splits: [{ plId: "pl-trad", mode: "percent", value: 40 }],
		});
	});

	it("warns when percent legs do not sum to 100", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "percent", value: 30 },
				])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Percentages total 90.0%/)).toBeInTheDocument();
	});

	it("does not warn about percent total when a remainder leg is present", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: "pl-trad", mode: "remainder" },
				])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.queryByText(/Percentages total/)).toBeNull();
	});

	it("shows over-allocation in red when fixed legs exceed total", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "fixed", value: 12_000 }])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		const node = screen.getByText(/Over-allocated by/);
		expect(node).toBeInTheDocument();
		expect(node.className).toMatch(/text-red/);
	});

	it("renders the resolved dollar amount for a remainder leg", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-trad", mode: "fixed", value: 7500 },
					{ plId: "pl-roth", mode: "remainder" },
				])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		// Each leg shows its computed amount as "= $X"; remainder leg = $2,500.
		expect(screen.getByText(/= \$2,500/)).toBeInTheDocument();
	});

	it("uses a 1% stepper increment for percent legs", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 60 }])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		const input = screen.getByRole("spinbutton", {
			name: /split leg 1 value/i,
		});
		expect(input).toHaveAttribute("step", "1");
	});

	it("uses a $100 stepper increment for fixed legs", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "fixed", value: 5000 }])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		const input = screen.getByRole("spinbutton", {
			name: /split leg 1 value/i,
		});
		expect(input).toHaveAttribute("step", "100");
	});

	it("rounds typed percent values to 0.1 precision", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 60 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		const input = screen.getByRole("spinbutton", {
			name: /split leg 1 value/i,
		});
		fireEvent.change(input, { target: { value: "60.55" } });
		expect(onChange).toHaveBeenCalledWith({
			splits: [{ plId: "pl-roth", mode: "percent", value: 60.6 }],
		});
	});

	it("preserves a single-decimal percent value as typed", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 60 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		fireEvent.change(
			screen.getByRole("spinbutton", { name: /split leg 1 value/i }),
			{ target: { value: "60.5" } },
		);
		expect(onChange).toHaveBeenCalledWith({
			splits: [{ plId: "pl-roth", mode: "percent", value: 60.5 }],
		});
	});

	it("does not commit 0 when the user clears the field mid-edit", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 60 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		const input = screen.getByRole("spinbutton", {
			name: /split leg 1 value/i,
		});
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "" } });
		// Empty doesn't parse — no onChange call with 0 mid-edit.
		expect(onChange).not.toHaveBeenCalled();
	});

	it("commits 0 on blur if the user leaves the field empty", () => {
		// Blur normalizes a non-parsable draft to 0 so storage doesn't keep
		// a NaN-shaped value.
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 60 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		const input = screen.getByRole("spinbutton", {
			name: /split leg 1 value/i,
		});
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "" } });
		fireEvent.blur(input);
		expect(onChange).toHaveBeenLastCalledWith({
			splits: [{ plId: "pl-roth", mode: "percent", value: 0 }],
		});
	});

	it("does not round fixed-leg input values", () => {
		const onChange = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "fixed", value: 5000 }])}
				plAccounts={plAccounts}
				onChange={onChange}
				onCancel={vi.fn()}
			/>,
		);
		fireEvent.change(
			screen.getByRole("spinbutton", { name: /split leg 1 value/i }),
			{ target: { value: "5123.45" } },
		);
		expect(onChange).toHaveBeenCalledWith({
			splits: [{ plId: "pl-roth", mode: "fixed", value: 5123.45 }],
		});
	});

	it("offers a 'Don't sync this portion' option in each leg's PL select", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 100 }])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("option", { name: /Don't sync this portion/i }),
		).toBeInTheDocument();
	});

	it("annotates a leg targeting IGNORE_PL_ID as (ignored)", () => {
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([
					{ plId: "pl-roth", mode: "percent", value: 60 },
					{ plId: IGNORE_PL_ID, mode: "percent", value: 40 },
				])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByText(/\(ignored\)/i)).toBeInTheDocument();
	});

	it("invokes onCancel when 'Cancel split' is clicked", () => {
		const onCancel = vi.fn();
		render(
			<SplitEditor
				account={account}
				mapping={splitWith([{ plId: "pl-roth", mode: "percent", value: 100 }])}
				plAccounts={plAccounts}
				onChange={vi.fn()}
				onCancel={onCancel}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /cancel split/i }));
		expect(onCancel).toHaveBeenCalled();
	});
});
