# Changelog

## [0.7.0](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.6.0...v0.7.0) (2026-05-03)


### Features

* **settings:** show version number ([#36](https://github.com/alex-stout/projectionlab-account-sync/issues/36)) ([bbace66](https://github.com/alex-stout/projectionlab-account-sync/commit/bbace665bef2c0856210d401ce6e721ceb5cd806))


### Bug Fixes

* **vanguard:** dashboard url ([#37](https://github.com/alex-stout/projectionlab-account-sync/issues/37)) ([fd66bde](https://github.com/alex-stout/projectionlab-account-sync/commit/fd66bde16394bf0bc81a7edf358b7e55509da9eb))

## [0.6.0](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.5.1...v0.6.0) (2026-04-29)

### Highlights

**Monarch is now a supported source.** If you track your accounts in [Monarch Money](https://www.monarchmoney.com/), you can now sync those balances straight into ProjectionLab — no manual entry, no CSV exports. This is the fourth source the extension supports, alongside Vanguard, Alight, and YNAB.

#### How to use it

1. Open [app.monarch.com/accounts](https://app.monarch.com/accounts) and make sure your accounts are loaded
2. Click the extension icon, select **Monarch** in the sidebar, and hit **↻ Monarch**
3. Map each Monarch account to its ProjectionLab counterpart in **Settings**
4. Click **Sync to ProjectionLab**

#### How it works under the hood

Monarch has no public API, so the extension reads balances directly from the Accounts page DOM. Rather than depending on Monarch's styled-components class hashes (which change with every build), the scraper anchors on two stable signals:

- `a[href^="/accounts/details/<id>"]` — one anchor per account row
- `span.fs-exclude` — Monarch tags account names and balances with this class for FullStory PII opt-out

Each value is run through the existing `parseMoney` helper to distinguish name from balance. This keeps the selector strategy resilient across Monarch UI redesigns.

Coverage: 14 unit tests, 2 end-to-end tests with a mock site, and 100% line/branch coverage on the new content script.

### Features

- **plugin:** Monarch Money support ([#33](https://github.com/alex-stout/projectionlab-account-sync/issues/33)) ([6d3784a](https://github.com/alex-stout/projectionlab-account-sync/commit/6d3784abc39762f19c8dc31840b0ec093de9f3af))

### Bug Fixes

- **ynab:** match the YNAB icon to the visual style of the other source icons — 24×24, rounded square, single-letter mark ([#35](https://github.com/alex-stout/projectionlab-account-sync/issues/35)) ([d04c79d](https://github.com/alex-stout/projectionlab-account-sync/commit/d04c79d709d71254d9ae1bb060692904f0f53624))

### Documentation

The README, privacy policy, contributing guide, and bug-report template have all been updated to list Monarch alongside the existing supported sources.

## [0.5.1](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.5.0...v0.5.1) (2026-04-28)

### Miscellaneous Chores

- release 0.5.1 ([0380ebd](https://github.com/alex-stout/projectionlab-account-sync/commit/0380ebdeb316dc81ff8241efc230f515bacf37b1))

## [0.5.0](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.4.4...v0.5.0) (2026-04-28)

### Features

- Edge publish ([#27](https://github.com/alex-stout/projectionlab-account-sync/issues/27)) ([81df3f6](https://github.com/alex-stout/projectionlab-account-sync/commit/81df3f6b376c014c29647c5be0888628d4c9de17))

## [0.4.4](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.4.3...v0.4.4) (2026-04-28)

### Continuous Integration

- **publish:** fix Edge key version ([#24](https://github.com/alex-stout/projectionlab-account-sync/issues/24)) ([89c4abb](https://github.com/alex-stout/projectionlab-account-sync/commit/89c4abbdb7782ac5b41d287aa99c9053fdaa20aa))

## [0.4.3](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.4.2...v0.4.3) (2026-04-28)

### Bug Fixes

- **test:** button disabled when no PL accounts ([#19](https://github.com/alex-stout/projectionlab-account-sync/issues/19)) ([69621e7](https://github.com/alex-stout/projectionlab-account-sync/commit/69621e7d47f6885303cfeed5078c1920c22b6d09))

## [0.4.2](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.4.1...v0.4.2) (2026-04-22)

### Bug Fixes

- disable button if no accounts ([610dd6a](https://github.com/alex-stout/projectionlab-account-sync/commit/610dd6a0faf284fa1448dd9e379613819c131abf))

## [0.4.1](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.4.0...v0.4.1) (2026-04-22)

### Bug Fixes

- link text ([526a1e1](https://github.com/alex-stout/projectionlab-account-sync/commit/526a1e1b983e9f86f71f4767ea3395083120efb5))

## [0.4.0](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.3.0...v0.4.0) (2026-04-22)

### Features

- chrome publish ([a80f4dd](https://github.com/alex-stout/projectionlab-account-sync/commit/a80f4dd372ca3d2f48415f70748583c97eaf6851))

## [0.3.0](https://github.com/alex-stout/projectionlab-account-sync/compare/v0.2.0...v0.3.0) (2026-04-22)

### Features

- toggle plugins ([#7](https://github.com/alex-stout/projectionlab-account-sync/issues/7)) ([6ca7409](https://github.com/alex-stout/projectionlab-account-sync/commit/6ca7409c81229ba1652aee29c8e47c3a78e162d4))

### Bug Fixes

- delete data label ([#15](https://github.com/alex-stout/projectionlab-account-sync/issues/15)) ([0978114](https://github.com/alex-stout/projectionlab-account-sync/commit/0978114db8405e7376b3fbe93687e46476ffe926))
