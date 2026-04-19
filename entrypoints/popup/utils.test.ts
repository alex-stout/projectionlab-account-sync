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
});
