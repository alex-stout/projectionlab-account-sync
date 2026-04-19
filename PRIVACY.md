# Privacy Policy

_Last updated: April 2026_

ProjectionLab Account Sync does not collect, transmit, or share any of your data with anyone except ProjectionLab — and only then via the API key you provide. The developer has no access to your data at any point.

## What the extension touches

- **Your ProjectionLab API key**, which you enter in the extension's Settings panel.
- **Account names and balances** visible on the pages of supported institutions (currently Vanguard and Alight). These are read only when you explicitly click the refresh button for that source.
- **The list of accounts in your ProjectionLab plan**, fetched via ProjectionLab's official plugin API when you click refresh for ProjectionLab.
- **Your account mappings and last-refresh timestamps**, saved so the popup can show you what's linked and when.

## Where it's stored

All of the above is stored in `chrome.storage.local` — the browser's on-device storage scoped to this extension. It is never synced across browsers, never uploaded to any server controlled by the developer, and never shared with third parties.

## Where it goes

The only outbound network requests this extension makes are to ProjectionLab's plugin API (`app.projectionlab.com` and `ea.projectionlab.com`), authenticated with your own API key. No data is transmitted to any other destination.

## What it doesn't do

- No analytics, usage tracking, or telemetry.
- No error or crash reporting to remote servers.
- No reading of credentials, passwords, cookies, or session tokens from any site.
- No interaction with any website other than ProjectionLab and the financial institutions you explicitly request a refresh from.
- No background or scheduled activity. The extension acts only in response to a button click in the popup.

## Removing your data

Open the extension's Settings panel and click **Clear All Data** to remove your API key, cached accounts, mappings, and timestamps. Uninstalling the extension also clears everything it has stored.

## Contact

Questions or concerns: https://github.com/alex-stout/projectionlab-account-sync/issues
