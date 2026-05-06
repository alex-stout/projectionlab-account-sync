import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiPlugin } from "~/plugins";
import ApiPluginCreds from "./ApiPluginCreds";

const plugin: ApiPlugin = {
	id: "ynab",
	name: "YNAB",
	icon: "/y.png",
	kind: "api",
	credentials: [
		{
			key: "accessToken",
			label: "Access Token",
			type: "password",
			help: "Generate one in YNAB → Account Settings → Developer.",
		},
		{ key: "budgetId", label: "Budget ID", type: "text" },
	],
	refresh: vi.fn(),
};

beforeEach(() => {
	vi.mocked(browser.storage.local.get)
		.mockReset()
		.mockResolvedValue({} as any);
	vi.mocked(browser.storage.local.set as any)
		.mockReset()
		.mockResolvedValue(undefined);
	vi.mocked((browser.storage.local as any).remove)
		.mockReset()
		.mockResolvedValue(undefined);
});

describe("ApiPluginCreds", () => {
	it("renders the plugin's name in the heading", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		expect(screen.getByText("YNAB Credentials")).toBeInTheDocument();
	});

	it("renders one input per credential field with the right label", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		expect(screen.getByLabelText("Access Token")).toBeInTheDocument();
		expect(screen.getByLabelText("Budget ID")).toBeInTheDocument();
	});

	it("uses the credential field's `type` (password vs text)", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		expect(screen.getByLabelText("Access Token")).toHaveAttribute(
			"type",
			"password",
		);
		expect(screen.getByLabelText("Budget ID")).toHaveAttribute("type", "text");
	});

	it("renders help text when provided", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		expect(
			screen.getByText(/Generate one in YNAB → Account Settings → Developer/),
		).toBeInTheDocument();
	});

	it("does not render a help line for fields without help text", () => {
		// `budgetId` has no help; the only `<p>` inside its row should be absent.
		render(<ApiPluginCreds plugin={plugin} />);
		// Locate the budgetId input and check its parent has no help text node.
		const budgetField = screen.getByLabelText("Budget ID")
			.parentElement as HTMLElement;
		expect(budgetField.querySelectorAll("p")).toHaveLength(0);
	});

	it("loads existing credentials from storage on mount", async () => {
		vi.mocked(browser.storage.local.get).mockResolvedValueOnce({
			creds_ynab: { accessToken: "tok-abc", budgetId: "budget-123" },
		} as any);
		render(<ApiPluginCreds plugin={plugin} />);
		await waitFor(() =>
			expect(screen.getByLabelText("Access Token")).toHaveValue("tok-abc"),
		);
		expect(screen.getByLabelText("Budget ID")).toHaveValue("budget-123");
	});

	it("starts with empty inputs when storage has no creds for this plugin", async () => {
		render(<ApiPluginCreds plugin={plugin} />);
		await waitFor(() =>
			expect(screen.getByLabelText("Access Token")).toHaveValue(""),
		);
		expect(screen.getByLabelText("Budget ID")).toHaveValue("");
	});

	it("disables Save until every credential field has a non-blank value", async () => {
		render(<ApiPluginCreds plugin={plugin} />);
		const saveBtn = screen.getByRole("button", { name: /^Save$/ });
		expect(saveBtn).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		expect(saveBtn).toBeDisabled(); // budgetId still empty

		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "b-1" },
		});
		expect(saveBtn).toBeEnabled();
	});

	it("treats whitespace-only input as empty for Save validation", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "   " },
		});
		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "b-1" },
		});
		expect(screen.getByRole("button", { name: /^Save$/ })).toBeDisabled();
	});

	it("hides the Clear button when no field has a value", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		expect(
			screen.queryByRole("button", { name: "Clear" }),
		).not.toBeInTheDocument();
	});

	it("shows the Clear button when at least one field has a value", () => {
		render(<ApiPluginCreds plugin={plugin} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
	});

	it("Save persists trimmed values via setCreds and notifies parent", async () => {
		const onCredsChange = vi.fn();
		render(<ApiPluginCreds plugin={plugin} onCredsChange={onCredsChange} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "  tok-abc  " },
		});
		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "  budget-123  " },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
		});
		expect(browser.storage.local.set).toHaveBeenCalledWith({
			creds_ynab: { accessToken: "tok-abc", budgetId: "budget-123" },
		});
		expect(onCredsChange).toHaveBeenCalledWith("ynab", true);
	});

	it("shows ✓ Saved feedback after a successful save", async () => {
		render(<ApiPluginCreds plugin={plugin} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "b" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
		});
		expect(screen.getByRole("button", { name: "✓ Saved" })).toBeInTheDocument();
	});

	it("reverts to plain Save text when the user types after a save", async () => {
		render(<ApiPluginCreds plugin={plugin} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "b" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
		});
		expect(screen.getByRole("button", { name: "✓ Saved" })).toBeInTheDocument();

		// Typing should immediately reset the saved state.
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok-2" },
		});
		expect(screen.getByRole("button", { name: /^Save$/ })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "✓ Saved" }),
		).not.toBeInTheDocument();
	});

	it("Clear removes the plugin's creds from storage and notifies parent", async () => {
		const onCredsChange = vi.fn();
		render(<ApiPluginCreds plugin={plugin} onCredsChange={onCredsChange} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Clear" }));
		});
		expect(browser.storage.local.remove).toHaveBeenCalledWith("creds_ynab");
		expect(onCredsChange).toHaveBeenCalledWith("ynab", false);
	});

	it("Clear empties every credential input", async () => {
		render(<ApiPluginCreds plugin={plugin} />);
		fireEvent.change(screen.getByLabelText("Access Token"), {
			target: { value: "tok" },
		});
		fireEvent.change(screen.getByLabelText("Budget ID"), {
			target: { value: "b-1" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Clear" }));
		});
		expect(screen.getByLabelText("Access Token")).toHaveValue("");
		expect(screen.getByLabelText("Budget ID")).toHaveValue("");
	});

	it("re-loads credentials from storage when the plugin id prop changes", async () => {
		vi.mocked(browser.storage.local.get)
			.mockResolvedValueOnce({
				creds_ynab: { accessToken: "first", budgetId: "b1" },
			} as any)
			.mockResolvedValueOnce({
				creds_other: { accessToken: "second", budgetId: "b2" },
			} as any);

		const otherPlugin: ApiPlugin = { ...plugin, id: "other", name: "Other" };
		const { rerender } = render(<ApiPluginCreds plugin={plugin} />);
		await waitFor(() =>
			expect(screen.getByLabelText("Access Token")).toHaveValue("first"),
		);

		rerender(<ApiPluginCreds plugin={otherPlugin} />);
		await waitFor(() =>
			expect(screen.getByLabelText("Access Token")).toHaveValue("second"),
		);
	});
});
