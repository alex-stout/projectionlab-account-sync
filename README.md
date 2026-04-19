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

## Development

```sh
npm install

# Chrome
npm run dev

# Firefox
npm run dev:firefox
```

## Building

```sh
# Chrome
npm run build

# Firefox
npm run build:firefox

# Chrome with E2E test URLs enabled
npm run build:e2e
```

## Testing

```sh
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (Playwright + Chromium)
npm run e2e
```

## Adding a plugin

1. Create a directory under `plugins/<name>/` with:
   - `index.ts` — plugin metadata (`id`, `name`, `icon`, `urlPatterns`)
   - `content.ts` — DOM scraper using `createMain` from `../content-utils`
   - `mock-site/index.html` — mock page for e2e testing
2. Register the plugin in `plugins/index.ts`
3. Import and register the content handler in `entrypoints/plugin.content.ts`
