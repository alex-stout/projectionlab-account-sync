import { describe, it, expect } from "vitest";
import { matchesPattern } from "./plugin.content";

const MATCH_URL = "https://www.vanguard.com/en/investor/portfolio/dashboard/*";

describe("matchesPattern", () => {
  it("matches a simple wildcard pattern", () => {
    expect(
      matchesPattern(
        "https://www.vanguard.com/en/investor/portfolio/dashboard/portfolio",
        MATCH_URL,
      ),
    ).toBe(true);
  });

  it("matches root path with wildcard", () => {
    expect(
      matchesPattern(
        "https://www.vanguard.com/en/investor/portfolio/dashboard/",
        MATCH_URL,
      ),
    ).toBe(true);
  });

  it("does not match a different domain", () => {
    expect(
      matchesPattern(
        "https://notreal.com/www.vanguard.com/en/investor/portfolio/dashboard/",
        MATCH_URL,
      ),
    ).toBe(false);
  });

  it("matches alight pattern", () => {
    expect(
      matchesPattern(
        "https://worklife.alight.com/web/employer/homepage",
        "https://worklife.alight.com/*",
      ),
    ).toBe(true);
  });

  it("does not match wrong scheme", () => {
    expect(
      matchesPattern(
        "http://www.vanguard.com/en/investor/portfolio/dashboard/path",
        "https://www.vanguard.com/en/investor/portfolio/dashboard/*",
      ),
    ).toBe(false);
  });

  it("matches localhost pattern", () => {
    expect(
      matchesPattern("http://localhost/some/path", "http://localhost/*"),
    ).toBe(true);
  });
});
