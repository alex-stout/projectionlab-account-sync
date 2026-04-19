import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { accountKey, fmt, timeAgo } from "./utils";
import type { Account } from "~/types";

const base: Account = {
  name: "Vanguard 401k",
  balance: 100000,
  rateOfReturn: null,
  accountId: null,
};

describe("accountKey", () => {
  it("prefers accountId over name", () => {
    expect(accountKey({ ...base, accountId: "abc-123" }, 0)).toBe("abc-123");
  });

  it("falls back to name when no accountId", () => {
    expect(accountKey(base, 0)).toBe("Vanguard 401k");
  });
});

describe("fmt", () => {
  it("formats whole numbers with dollar sign", () => {
    expect(fmt(1000)).toBe("$1,000");
  });

  it("formats zero", () => {
    expect(fmt(0)).toBe("$0");
  });

  it("formats large balances", () => {
    expect(fmt(1234567)).toBe("$1,234,567");
  });

  it("formats negative balances with the minus outside the dollar sign", () => {
    expect(fmt(-1500)).toBe("-$1,500");
  });

  it("formats a large negative balance (credit card / mortgage)", () => {
    expect(fmt(-250_000)).toBe("-$250,000");
  });

  it("preserves two-decimal cents", () => {
    expect(fmt(100.99)).toBe("$100.99");
  });

  it("drops trailing zero on a .50 value (toLocaleString default)", () => {
    // Pins current behavior: a future change to always show 2 decimals
    // would break this assertion and force a conscious decision.
    expect(fmt(100.5)).toBe("$100.5");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'never' for null", () => {
    expect(timeAgo(null)).toBe("never");
  });

  it("returns 'just now' for < 60s ago", () => {
    const now = Date.now();
    vi.setSystemTime(now + 30_000);
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes for < 1h ago", () => {
    const now = Date.now();
    vi.setSystemTime(now + 5 * 60_000);
    expect(timeAgo(now)).toBe("5m ago");
  });

  it("returns hours for >= 1h ago", () => {
    const now = Date.now();
    vi.setSystemTime(now + 3 * 3600_000);
    expect(timeAgo(now)).toBe("3h ago");
  });

  it("returns hours at the upper boundary (23h)", () => {
    const now = Date.now();
    vi.setSystemTime(now + 23 * 3600_000);
    expect(timeAgo(now)).toBe("23h ago");
  });

  it("returns days for >= 24h ago", () => {
    const now = Date.now();
    vi.setSystemTime(now + 24 * 3600_000);
    expect(timeAgo(now)).toBe("1d ago");
  });

  it("returns days for multi-day gaps", () => {
    const now = Date.now();
    vi.setSystemTime(now + 5 * 86400_000);
    expect(timeAgo(now)).toBe("5d ago");
  });
});
