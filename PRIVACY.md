# Privacy Policy

_Last updated: April 2026_

ProjectionLab Account Sync does not collect, transmit, or share any of your data with anyone except ProjectionLab — and only then via the API key you provide. The developer has no access to your data at any point.

## What the extension touches

- **Your ProjectionLab API key**, which you enter in the extension's Settings panel.
- **Your YNAB Personal Access Token**, if you choose to use the YNAB source. Entered in the extension's Settings panel and used only to authenticate API requests to YNAB on your behalf.
- **Account names and balances** from supported sources (currently Vanguard, Alight, and YNAB). For Vanguard and Alight, these are read from pages you have open in your browser; for YNAB, they are fetched from the YNAB API using your token. In all cases, reads happen only when you explicitly click the refresh button for that source.
- **The list of accounts in your ProjectionLab plan**, fetched via ProjectionLab's official plugin API when you click refresh for ProjectionLab.
- **Your account mappings and last-refresh timestamps**, saved so the popup can show you what's linked and when.

## Where it's stored

All of the above is stored in `chrome.storage.local` — the browser's on-device storage scoped to this extension. It is never synced across browsers, never uploaded to any server controlled by the developer, and never shared with third parties.

**Credentials are stored in plaintext.** Like most browser extensions, this one does not encrypt your ProjectionLab API key, YNAB Personal Access Token, or any other saved credentials at rest — the browser's extension storage is not encrypted by default. Anyone with access to your browser profile directory (local malware, a shared OS account, an unencrypted disk that falls into the wrong hands) can read them. To reduce this risk: use a password-protected OS account, enable full-disk encryption (FileVault, BitLocker, LUKS), and revoke any saved token you suspect may have been exposed. You can clear all stored credentials at any time via **Settings → Clear All Data**.

## Where it goes

The only outbound network requests this extension makes are:

- To ProjectionLab's plugin API (`app.projectionlab.com` and `ea.projectionlab.com`), authenticated with your own API key.
- To the YNAB API (`api.ynab.com`), authenticated with your own Personal Access Token, and only when you click refresh for YNAB.

No data is transmitted to any other destination.

## What it doesn't do

- No analytics, usage tracking, or telemetry.
- No error or crash reporting to remote servers.
- No reading of credentials, passwords, cookies, or session tokens from any site.
- No interaction with any website other than ProjectionLab and the financial institutions you explicitly request a refresh from.
- No background or scheduled activity. The extension acts only in response to a button click in the popup.

## Removing your data

Open the extension's Settings panel and click **Clear All Data** to remove your ProjectionLab API key, YNAB token, cached accounts, mappings, and timestamps. Uninstalling the extension also clears everything it has stored.

## Contact

Questions or concerns: https://github.com/alex-stout/projectionlab-account-sync/issues
