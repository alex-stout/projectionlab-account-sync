import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";
import type { SourcePlugin } from "~/plugins";

const plugins: SourcePlugin[] = [
  { id: "vanguard", name: "Vanguard", icon: "/v.png", kind: "content", urlPatterns: ["https://vanguard.com/*"] },
  { id: "alight", name: "Alight", icon: "/a.png", kind: "content", urlPatterns: ["https://alight.com/*"] },
];

const defaultProps = {
  plugins,
  activeId: "vanguard",
  lastSynced: {},
  available: {},
  settingsActive: false,
  hasApiKey: true,
  onSelect: vi.fn(),
  onSettings: vi.fn(),
};

describe("Sidebar", () => {
  it("renders a button for each plugin", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTitle("Vanguard")).toBeInTheDocument();
    expect(screen.getByTitle("Alight")).toBeInTheDocument();
  });

  it("calls onSelect with plugin id when a button is clicked", () => {
    const onSelect = vi.fn();
    render(<Sidebar {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle("Alight"));
    expect(onSelect).toHaveBeenCalledWith("alight");
  });

  it("shows lastSynced timestamp for plugins with a sync time", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar {...defaultProps} lastSynced={{ vanguard: now }} />);
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not show timestamp when plugin has no lastSynced", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it("shows availability dot for available plugins", () => {
    render(<Sidebar {...defaultProps} available={{ alight: true }} />);
    const alightBtn = screen.getByTitle("Alight");
    expect(alightBtn.querySelector(".bg-green-400")).toBeInTheDocument();
  });

  it("does not show availability dot for unavailable plugins", () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    expect(container.querySelector(".bg-green-400")).not.toBeInTheDocument();
  });

  it("uses indigo timestamp color when plugin is active", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar {...defaultProps} lastSynced={{ vanguard: now }} />);
    expect(screen.getByText("5m ago")).toHaveClass("text-indigo-200");
    vi.useRealTimers();
  });

  it("uses slate timestamp color when plugin is inactive", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar {...defaultProps} lastSynced={{ alight: now }} />);
    expect(screen.getByText("5m ago")).toHaveClass("text-slate-500");
    vi.useRealTimers();
  });

  it("uses indigo dot color when active plugin is available", () => {
    render(<Sidebar {...defaultProps} available={{ vanguard: true }} />);
    const btn = screen.getByTitle("Vanguard");
    expect(btn.querySelector(".bg-indigo-200")).toBeInTheDocument();
  });

  it("shows the PL header label", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("PL Sync")).toBeInTheDocument();
  });

  it("renders the Settings gear button", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
  });

  it("calls onSettings when gear button is clicked", () => {
    const onSettings = vi.fn();
    render(<Sidebar {...defaultProps} onSettings={onSettings} />);
    fireEvent.click(screen.getByTitle("Settings"));
    expect(onSettings).toHaveBeenCalled();
  });

  it("shows amber dot on gear button when hasApiKey is false", () => {
    const { container } = render(<Sidebar {...defaultProps} hasApiKey={false} />);
    const settingsBtn = screen.getByTitle("Settings");
    expect(settingsBtn.querySelector(".bg-amber-400")).toBeInTheDocument();
  });

  it("does not show amber dot when hasApiKey is true", () => {
    const { container } = render(<Sidebar {...defaultProps} hasApiKey={true} />);
    const settingsBtn = screen.getByTitle("Settings");
    expect(settingsBtn.querySelector(".bg-amber-400")).not.toBeInTheDocument();
  });

  it("applies active style to gear button when settingsActive is true", () => {
    render(<Sidebar {...defaultProps} settingsActive={true} />);
    expect(screen.getByTitle("Settings")).toHaveClass("bg-indigo-600");
  });

  it("plugin buttons are not active when settingsActive is true", () => {
    render(<Sidebar {...defaultProps} settingsActive={true} activeId="vanguard" />);
    expect(screen.getByTitle("Vanguard")).not.toHaveClass("bg-indigo-600");
  });
});
