import { describe, it, expect } from "vitest";
import { matchesPattern } from "./plugin.content";

describe("matchesPattern", () => {
  it("matches a simple wildcard pattern", () => {
    expect(matchesPattern("https://dashboard.web.vanguard.com/portfolio", "https://dashboard.web.vanguard.com/*")).toBe(true);
  });

  it("matches root path with wildcard", () => {
    expect(matchesPattern("https://dashboard.web.vanguard.com/", "https://dashboard.web.vanguard.com/*")).toBe(true);
  });

  it("does not match a different domain", () => {
    expect(matchesPattern("https://evil.com/dashboard.web.vanguard.com/", "https://dashboard.web.vanguard.com/*")).toBe(false);
  });

  it("matches alight pattern", () => {
    expect(matchesPattern("https://worklife.alight.com/web/mckinsey/homepage", "https://worklife.alight.com/*")).toBe(true);
  });

  it("does not match wrong scheme", () => {
    expect(matchesPattern("http://dashboard.web.vanguard.com/path", "https://dashboard.web.vanguard.com/*")).toBe(false);
  });

  it("matches localhost pattern", () => {
    expect(matchesPattern("http://localhost/some/path", "http://localhost/*")).toBe(true);
  });
});
