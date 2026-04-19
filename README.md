# ProjectionLab Account Sync

A Chrome/Firefox browser extension that syncs account balances from financial institutions into [ProjectionLab](https://projectionlab.com).

![Code Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen?style=flat)

> **Community project** — This extension is not affiliated with, endorsed by, or maintained by ProjectionLab. It is an independent community tool that uses ProjectionLab's plugin API.

## Supported sources

- **Vanguard** — scrapes balances from the portfolio overview page
- **Alight** — scrapes balances from the retirement overview page

## How it works

1. Open your financial institution's site and click **↻ [Source]** in the extension popup to pull current balances
2. Open ProjectionLab, then click **↻ ProjectionLab** to load your PL accounts
3. Map each source account to its corresponding ProjectionLab account
4. Click **Sync to ProjectionLab** to push balances

A ProjectionLab API key is required. Add it in the extension's **Settings** panel.

## Intended use

This extension is designed for personal use only — syncing your own accounts for your own financial planning. It is intended to be used infrequently (e.g. monthly when reviewing your plan), not on an automated or scheduled basis. Users are responsible for ensuring their own use.

## Privacy

Account balances are read directly from your browser and sent only to the ProjectionLab API using your own API key. No data is stored remotely or transmitted anywhere else. The API key itself is stored in `localstorage` — local to your browser, never synced or shared.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and how to add support for a new financial institution.
