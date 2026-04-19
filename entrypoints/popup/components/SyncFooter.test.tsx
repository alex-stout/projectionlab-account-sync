import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncFooter from "./SyncFooter";

describe("SyncFooter", () => {
  it("shows mapped count", () => {
    render(<SyncFooter mappedCount={2} totalCount={3} plAccountsLoaded={true} plSync={{ status: "idle" }} onSync={vi.fn()} />);
    expect(screen.getByText("2 of 3 mapped")).toBeInTheDocument();
  });

  it("shows PL open prompt when plAccountsLoaded is false", () => {
    render(<SyncFooter mappedCount={0} totalCount={2} plAccountsLoaded={false} plSync={{ status: "idle" }} onSync={vi.fn()} />);
    expect(screen.getByText(/Open ProjectionLab/)).toBeInTheDocument();
  });

  it("hides PL open prompt when plAccountsLoaded is true", () => {
    render(<SyncFooter mappedCount={1} totalCount={1} plAccountsLoaded={true} plSync={{ status: "idle" }} onSync={vi.fn()} />);
    expect(screen.queryByText(/Open ProjectionLab/)).not.toBeInTheDocument();
  });

  it("enables sync button when mappedCount > 0 and not syncing", () => {
    render(<SyncFooter mappedCount={1} totalCount={1} plAccountsLoaded={true} plSync={{ status: "idle" }} onSync={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sync to ProjectionLab" })).not.toBeDisabled();
  });

  it("disables sync button when mappedCount is 0", () => {
    render(<SyncFooter mappedCount={0} totalCount={2} plAccountsLoaded={true} plSync={{ status: "idle" }} onSync={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables sync button while syncing", () => {
    render(<SyncFooter mappedCount={2} totalCount={2} plAccountsLoaded={true} plSync={{ status: "syncing" }} onSync={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Syncing…" })).toBeDisabled();
  });

  it("shows Syncing… label while syncing", () => {
    render(<SyncFooter mappedCount={1} totalCount={1} plAccountsLoaded={true} plSync={{ status: "syncing" }} onSync={vi.fn()} />);
    expect(screen.getByText("Syncing…")).toBeInTheDocument();
  });

  it("calls onSync when button clicked", () => {
    const onSync = vi.fn();
    render(<SyncFooter mappedCount={1} totalCount={1} plAccountsLoaded={true} plSync={{ status: "idle" }} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSync).toHaveBeenCalledOnce();
  });

  it("does not call onSync when clicked while already syncing", () => {
    const onSync = vi.fn();
    render(
      <SyncFooter
        mappedCount={1}
        totalCount={1}
        plAccountsLoaded={true}
        plSync={{ status: "syncing" }}
        onSync={onSync}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSync).not.toHaveBeenCalled();
  });

  it("does not call onSync when clicked with zero mapped accounts", () => {
    const onSync = vi.fn();
    render(
      <SyncFooter
        mappedCount={0}
        totalCount={3}
        plAccountsLoaded={true}
        plSync={{ status: "idle" }}
        onSync={onSync}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSync).not.toHaveBeenCalled();
  });

  it("shows error message when status is error", () => {
    render(<SyncFooter mappedCount={1} totalCount={1} plAccountsLoaded={true} plSync={{ status: "error", message: "API failed" }} onSync={vi.fn()} />);
    expect(screen.getByText("API failed")).toBeInTheDocument();
  });

  it("shows successful results when status is done", () => {
    render(
      <SyncFooter
        mappedCount={1} totalCount={1} plAccountsLoaded={true}
        plSync={{ status: "done", results: [{ name: "IRA", ok: true }] }}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText("IRA")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows failed results with error detail when status is done", () => {
    render(
      <SyncFooter
        mappedCount={1} totalCount={1} plAccountsLoaded={true}
        plSync={{ status: "done", results: [{ name: "401k", ok: false, error: "not found" }] }}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText(/401k: not found/)).toBeInTheDocument();
    expect(screen.getByText("✗")).toBeInTheDocument();
  });

  it("shows mixed results correctly", () => {
    render(
      <SyncFooter
        mappedCount={2} totalCount={2} plAccountsLoaded={true}
        plSync={{ status: "done", results: [{ name: "IRA", ok: true }, { name: "401k", ok: false, error: "err" }] }}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText("IRA")).toBeInTheDocument();
    expect(screen.getByText(/401k: err/)).toBeInTheDocument();
  });
});
