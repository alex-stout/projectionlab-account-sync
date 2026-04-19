import { describe, it, expect } from "vitest";
import { extractAccountId, extractPortfolio } from "./content";

describe("extractAccountId", () => {
  it("extracts accountId from href", () => {
    expect(extractAccountId("https://example.com?ss-accountIds=12345")).toBe("12345");
  });

  it("returns null when param is missing", () => {
    expect(extractAccountId("https://example.com/other")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractAccountId(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractAccountId("")).toBeNull();
  });
});

describe("extractPortfolio", () => {
  it("extracts account with anchor link and accountId", () => {
    document.body.innerHTML = `
      <div class="individual-account-container">
        <a class="account-holdings-link" href="?ss-accountIds=99">My 401k</a>
        <div class="balance"><span>$50,000</span></div>
        <div class="rate-of-return"><span>8.2%</span></div>
      </div>
    `;
    expect(extractPortfolio()).toEqual([{
      name: "My 401k",
      balance: 50000,
      accountId: "99",
    }]);
  });

  it("extracts account when name element is not an anchor", () => {
    document.body.innerHTML = `
      <div class="individual-account-container">
        <span class="account-holdings-link">Brokerage</span>
        <div class="balance"><span>$10,000</span></div>
      </div>
    `;
    const result = extractPortfolio();
    expect(result[0].name).toBe("Brokerage");
    expect(result[0].accountId).toBeNull();
  });

  it("skips containers missing a name", () => {
    document.body.innerHTML = `
      <div class="individual-account-container">
        <div class="balance"><span>$1,000</span></div>
      </div>
    `;
    expect(extractPortfolio()).toEqual([]);
  });

  it("skips containers missing a balance", () => {
    document.body.innerHTML = `
      <div class="individual-account-container">
        <a class="account-holdings-link">Account</a>
      </div>
    `;
    expect(extractPortfolio()).toEqual([]);
  });

  it("returns empty array when no containers", () => {
    document.body.innerHTML = "";
    expect(extractPortfolio()).toEqual([]);
  });
});
