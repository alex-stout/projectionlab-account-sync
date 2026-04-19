import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountList from "./AccountList";
import type { SourcePlugin } from "~/plugins";
import type { Account } from "~/types";

const plugin: SourcePlugin = {
  id: "vanguard",
  name: "Vanguard",
  icon: "/v.png",
  kind: "content",
  urlPatterns: ["https://vanguard.com/*"],
};

const accounts: Account[] = [
  { name: "IRA", balance: 5000, rateOfReturn: null, accountId: null },
  { name: "401k", balance: 20000, rateOfReturn: null, accountId: "acc-2" },
];

describe("AccountList", () => {
  it("shows empty state with plugin name when no accounts", () => {
    render(
      <AccountList
        plugin={plugin}
        accounts={[]}
        mappings={{}}
        plAccounts={[]}
        sourceError={null}
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Open Vanguard/)).toBeInTheDocument();
    expect(screen.getByAltText("Vanguard")).toBeInTheDocument();
  });

  it("shows plugin hint in empty state when provided", () => {
    const pluginWithHint = { ...plugin, hint: "Custom hint text" };
    render(
      <AccountList
        plugin={pluginWithHint}
        accounts={[]}
        mappings={{}}
        plAccounts={[]}
        sourceError={null}
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Custom hint text")).toBeInTheDocument();
  });

  it("renders a row for each account", () => {
    render(
      <AccountList
        plugin={plugin}
        accounts={accounts}
        mappings={{}}
        plAccounts={[]}
        sourceError={null}
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("IRA")).toBeInTheDocument();
    expect(screen.getByText("401k")).toBeInTheDocument();
  });

  it("renders column headers when accounts are present", () => {
    render(
      <AccountList
        plugin={plugin}
        accounts={accounts}
        mappings={{}}
        plAccounts={[]}
        sourceError={null}
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Vanguard account")).toBeInTheDocument();
    expect(screen.getByText("ProjectionLab")).toBeInTheDocument();
  });

  it("shows sourceError when provided", () => {
    render(
      <AccountList
        plugin={plugin}
        accounts={[]}
        mappings={{}}
        plAccounts={[]}
        sourceError="Tab not open"
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Tab not open")).toBeInTheDocument();
  });

  it("does not show error element when sourceError is null", () => {
    render(
      <AccountList
        plugin={plugin}
        accounts={accounts}
        mappings={{}}
        plAccounts={[]}
        sourceError={null}
        onMappingChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
