import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PanelHeader from "./PanelHeader";

describe("PanelHeader", () => {
  const defaults = {
    pluginName: "Vanguard",
    loading: false,
    lastRefreshed: null,
    plLoading: false,
    onRefreshSource: vi.fn(),
    onRefreshPL: vi.fn(),
  };

  it("renders both refresh buttons", () => {
    render(<PanelHeader {...defaults} />);
    expect(screen.getByText("↻ Vanguard")).toBeInTheDocument();
    expect(screen.getByText("↻ ProjectionLab")).toBeInTheDocument();
  });

  it("shows Loading… on source button when loading", () => {
    render(<PanelHeader {...defaults} loading={true} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("↻ Vanguard")).not.toBeInTheDocument();
  });

  it("disables source button when loading", () => {
    render(<PanelHeader {...defaults} loading={true} />);
    const btn = screen.getByRole("button", { name: "Loading…" });
    expect(btn).toBeDisabled();
  });

  it("shows Loading… on PL button when plLoading", () => {
    render(<PanelHeader {...defaults} plLoading={true} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("↻ ProjectionLab")).not.toBeInTheDocument();
  });

  it("disables PL button when plLoading", () => {
    render(<PanelHeader {...defaults} plLoading={true} />);
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("shows lastRefreshed timestamp when provided", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 3 * 3600_000);
    render(<PanelHeader {...defaults} lastRefreshed={now} />);
    expect(screen.getByText("3h ago")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not show timestamp when lastRefreshed is null", () => {
    render(<PanelHeader {...defaults} lastRefreshed={null} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it("calls onRefreshSource when source button clicked", () => {
    const onRefreshSource = vi.fn();
    render(<PanelHeader {...defaults} onRefreshSource={onRefreshSource} />);
    fireEvent.click(screen.getByText("↻ Vanguard"));
    expect(onRefreshSource).toHaveBeenCalledOnce();
  });

  it("calls onRefreshPL when PL button clicked", () => {
    const onRefreshPL = vi.fn();
    render(<PanelHeader {...defaults} onRefreshPL={onRefreshPL} />);
    fireEvent.click(screen.getByText("↻ ProjectionLab"));
    expect(onRefreshPL).toHaveBeenCalledOnce();
  });
});
