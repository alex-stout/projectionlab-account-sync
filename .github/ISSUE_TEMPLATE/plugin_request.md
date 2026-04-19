---
name: Plugin request
about: Request support for a new financial institution
labels: plugin-request
---

**Institution name**
e.g. Fidelity, Schwab, TIAA

**URL of the page where account balances are shown**
e.g. https://www.fidelity.com/balances

**What accounts or balances are displayed there**
e.g. 401(k), brokerage, HSA — describe what's visible on the page.

**HTML snippet or CSS selectors**
To build the scraper, we need to know how the page is structured. Please provide one of:

- A sanitized HTML snippet of the account balance section (replace all real numbers and account names with fake ones before pasting)
- The CSS selectors for the account name and balance elements (right-click the element in DevTools → Copy → Copy selector)

> **Privacy reminder** — never include real account numbers, balances, passwords, or any other personal or financial information in this report. Replace all real values with placeholder text before sharing any HTML.

**Are you able to contribute the plugin yourself?**
See [CONTRIBUTING.md](../../CONTRIBUTING.md) for how to add a plugin. PRs welcome.
