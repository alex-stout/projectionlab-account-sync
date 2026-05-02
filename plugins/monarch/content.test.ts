import { describe, expect, it } from "vitest";
import { extractAccountId, extractPortfolio } from "./content";

describe("extractAccountId", () => {
	it("extracts accountId from href", () => {
		expect(extractAccountId("/accounts/details/242406126284842102")).toBe(
			"242406126284842102",
		);
	});

	it("extracts accountId from absolute URL", () => {
		expect(
			extractAccountId("https://app.monarch.com/accounts/details/12345"),
		).toBe("12345");
	});

	it("returns null when no id present", () => {
		expect(extractAccountId("/accounts/details/")).toBeNull();
	});

	it("returns null for undefined", () => {
		expect(extractAccountId(undefined)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(extractAccountId("")).toBeNull();
	});
});

describe("extractPortfolio", () => {
	it("extracts a single account with name, balance, and id", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/242406126284842102">
        <span class="fs-exclude">Checking</span>
        <span>Checking</span>
        <span class="fs-exclude">$1,001.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{
				name: "Checking",
				balance: 1001,
				accountId: "242406126284842102",
			},
		]);
	});

	it("extracts multiple accounts across groups", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/1">
        <span class="fs-exclude">Checking</span>
        <span class="fs-exclude">$1,001.00</span>
      </a>
      <a href="/accounts/details/2">
        <span class="fs-exclude">Brokerage - Vanguard</span>
        <span class="fs-exclude">$1,002.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Checking", balance: 1001, accountId: "1" },
			{ name: "Brokerage - Vanguard", balance: 1002, accountId: "2" },
		]);
	});

	it("parses negative balances", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/3">
        <span class="fs-exclude">Credit Card</span>
        <span class="fs-exclude">-$500.25</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Credit Card", balance: -500.25, accountId: "3" },
		]);
	});

	it("ignores non-fs-exclude spans even if they look like names", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/4">
        <span>Header text</span>
        <span class="fs-exclude">Real Account</span>
        <span class="fs-exclude">$50.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Real Account", balance: 50, accountId: "4" },
		]);
	});

	it("skips anchors missing a balance", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/5">
        <span class="fs-exclude">Just a name</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("skips anchors missing a name", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/6">
        <span class="fs-exclude">$1,000.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("skips empty and whitespace-only fs-exclude spans", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/7">
        <span class="fs-exclude"></span>
        <span class="fs-exclude">   </span>
        <span class="fs-exclude">Real Account</span>
        <span class="fs-exclude">$25.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Real Account", balance: 25, accountId: "7" },
		]);
	});

	it("returns empty array when no anchors match", () => {
		document.body.innerHTML = "<div>No accounts here</div>";
		expect(extractPortfolio()).toEqual([]);
	});

	it("ignores anchors that don't match the accounts/details pattern", () => {
		document.body.innerHTML = `
      <a href="/transactions/123">
        <span class="fs-exclude">Should be ignored</span>
        <span class="fs-exclude">$999.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("handles missing href gracefully", () => {
		document.body.innerHTML = `
      <a href="/accounts/details/">
        <span class="fs-exclude">Nameless</span>
        <span class="fs-exclude">$1.00</span>
      </a>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Nameless", balance: 1, accountId: null },
		]);
	});
});
