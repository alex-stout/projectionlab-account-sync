import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";
import type { SourcePlugin } from "~/plugins";

const plugins: SourcePlugin[] = [
  { id: "vanguard", name: "Vanguard", icon: "/v.png", urlPatterns: ["https://vanguard.com/*"] },
  { id: "alight", name: "Alight", icon: "/a.png", urlPatterns: ["https://alight.com/*"] },
];

describe("Sidebar", () => {
  it("renders a button for each plugin", () => {
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{}} onSelect={vi.fn()} />);
    expect(screen.getByTitle("Vanguard")).toBeInTheDocument();
    expect(screen.getByTitle("Alight")).toBeInTheDocument();
  });

  it("calls onSelect with plugin id when a button is clicked", () => {
    const onSelect = vi.fn();
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{}} onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle("Alight"));
    expect(onSelect).toHaveBeenCalledWith("alight");
  });

  it("shows lastSynced timestamp for plugins with a sync time", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{ vanguard: now }} available={{}} onSelect={vi.fn()} />);
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not show timestamp when plugin has no lastSynced", () => {
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{}} onSelect={vi.fn()} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it("shows availability dot for available plugins", () => {
    const { container } = render(
      <Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{ alight: true }} onSelect={vi.fn()} />
    );
    const alightBtn = screen.getByTitle("Alight");
    expect(alightBtn.querySelector(".bg-green-400")).toBeInTheDocument();
  });

  it("does not show availability dot for unavailable plugins", () => {
    const { container } = render(
      <Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{}} onSelect={vi.fn()} />
    );
    expect(container.querySelector(".bg-green-400")).not.toBeInTheDocument();
  });

  it("uses indigo timestamp color when plugin is active", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{ vanguard: now }} available={{}} onSelect={vi.fn()} />);
    expect(screen.getByText("5m ago")).toHaveClass("text-indigo-200");
    vi.useRealTimers();
  });

  it("uses slate timestamp color when plugin is inactive", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{ alight: now }} available={{}} onSelect={vi.fn()} />);
    expect(screen.getByText("5m ago")).toHaveClass("text-slate-500");
    vi.useRealTimers();
  });

  it("uses indigo dot color when active plugin is available", () => {
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{ vanguard: true }} onSelect={vi.fn()} />);
    const btn = screen.getByTitle("Vanguard");
    expect(btn.querySelector(".bg-indigo-200")).toBeInTheDocument();
  });

  it("shows the PL header label", () => {
    render(<Sidebar plugins={plugins} activeId="vanguard" lastSynced={{}} available={{}} onSelect={vi.fn()} />);
    expect(screen.getByText("PL")).toBeInTheDocument();
  });
});
