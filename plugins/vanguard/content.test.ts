import { describe, expect, it } from "vitest";
import { cleanName, extractAccountId, extractPortfolio } from "./content";

describe("extractAccountId", () => {
	it("returns the scroll-to-id value", () => {
		expect(extractAccountId("123456789012345")).toBe("123456789012345");
	});

	it("trims whitespace", () => {
		expect(extractAccountId("  987654321098765  ")).toBe("987654321098765");
	});

	it("returns null for null", () => {
		expect(extractAccountId(null)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(extractAccountId("")).toBeNull();
	});

	it("returns null for whitespace-only", () => {
		expect(extractAccountId("   ")).toBeNull();
	});
});

describe("cleanName", () => {
	it("strips trailing ' - <digits>*' suffix", () => {
		expect(cleanName("Brokerage Account - 11111111*")).toBe(
			"Brokerage Account",
		);
	});

	it("strips with extra whitespace around the suffix", () => {
		expect(cleanName("Roth IRA  -  22222* ")).toBe("Roth IRA");
	});

	it("returns the name unchanged when there is no masked-id suffix", () => {
		expect(cleanName("Traditional 401k")).toBe("Traditional 401k");
	});

	it("does not strip a hyphen that is not followed by digits-and-asterisk", () => {
		expect(cleanName("Joint - Brokerage")).toBe("Joint - Brokerage");
	});
});

describe("extractPortfolio", () => {
	it("strips the masked-id suffix from a self-managed account name", () => {
		document.body.innerHTML = `
      <c11n-accordion scroll-to-id="111111111111111" data-testid="account-id:111111111111111">
        <button class="c11n-accordion__trigger">
          <span class="c11n-accordion__heading">Brokerage Account - 11111111*</span>
          <span class="c11n-accordion__content">$1,234.56</span>
        </button>
      </c11n-accordion>
    `;
		expect(extractPortfolio()).toEqual([
			{
				name: "Brokerage Account",
				balance: 1234.56,
				accountId: "111111111111111",
			},
		]);
	});

	it("extracts an outside investment (no data-testid, no masked-id suffix)", () => {
		document.body.innerHTML = `
      <c11n-accordion scroll-to-id="222222222222222">
        <button class="c11n-accordion__trigger">
          <span class="c11n-accordion__heading">529 College Savings</span>
          <span class="c11n-accordion__content">$1,500.00</span>
        </button>
      </c11n-accordion>
    `;
		expect(extractPortfolio()).toEqual([
			{
				name: "529 College Savings",
				balance: 1500,
				accountId: "222222222222222",
			},
		]);
	});

	it("extracts both self-managed and outside investments in document order", () => {
		document.body.innerHTML = `
      <app-holdings-table data-testid="self-managed-accounts_table">
        <c11n-accordion scroll-to-id="111" data-testid="account-id:111">
          <span class="c11n-accordion__heading">Brokerage Account - 11111111*</span>
          <span class="c11n-accordion__content">$1,234.56</span>
        </c11n-accordion>
        <c11n-accordion scroll-to-id="222" data-testid="account-id:222">
          <span class="c11n-accordion__heading">Roth IRA</span>
          <span class="c11n-accordion__content">$1,800.00</span>
        </c11n-accordion>
      </app-holdings-table>
      <app-private-equity scroll-to-id="private-equity"></app-private-equity>
      <span scroll-to-id="outside-investments"></span>
      <app-outside-investments data-testid="manual-outside-investments_table">
        <c11n-accordion scroll-to-id="333">
          <span class="c11n-accordion__heading">529 College Savings</span>
          <span class="c11n-accordion__content">$1,500.00</span>
        </c11n-accordion>
      </app-outside-investments>
    `;
		expect(extractPortfolio()).toEqual([
			{ name: "Brokerage Account", balance: 1234.56, accountId: "111" },
			{ name: "Roth IRA", balance: 1800, accountId: "222" },
			{ name: "529 College Savings", balance: 1500, accountId: "333" },
		]);
	});

	it("ignores section-header elements that share scroll-to-id but are not c11n-accordion", () => {
		document.body.innerHTML = `
      <app-private-equity scroll-to-id="private-equity">
        <span class="c11n-accordion__heading">Should be ignored</span>
        <span class="c11n-accordion__content">$1.00</span>
      </app-private-equity>
      <span scroll-to-id="outside-investments"></span>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("skips containers missing a name", () => {
		document.body.innerHTML = `
      <c11n-accordion scroll-to-id="1">
        <span class="c11n-accordion__content">$1,000</span>
      </c11n-accordion>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("skips containers missing a balance", () => {
		document.body.innerHTML = `
      <c11n-accordion scroll-to-id="1">
        <span class="c11n-accordion__heading">Account</span>
      </c11n-accordion>
    `;
		expect(extractPortfolio()).toEqual([]);
	});

	it("returns empty array when no containers", () => {
		document.body.innerHTML = "";
		expect(extractPortfolio()).toEqual([]);
	});
});
