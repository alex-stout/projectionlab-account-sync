# Contributing

## Development setup

```sh
npm install
npm run dev       # Chrome
npm run dev:firefox
```

## Running tests

```sh
npm test                  # unit tests (watch mode)
npm run test:coverage     # unit tests with coverage report
npm run e2e               # build + Playwright e2e tests
```

## Adding a plugin

Plugins live in `plugins/<id>/` and come in two flavors, distinguished by the `kind` field on the plugin metadata:

- **Content plugins** (`kind: "content"`) scrape balances from a page the user has open in their browser. Use these when the institution has no public API. See `plugins/vanguard/` as a reference.
- **API plugins** (`kind: "api"`) fetch balances directly from a remote API using credentials the user enters in Settings. Use these when an API is available. See `plugins/ynab/` as a reference.

Pick the section below that matches your case.

---

### Adding a content plugin

#### 1. Create the plugin directory

```
plugins/<id>/
  index.ts          # plugin metadata
  content.ts        # DOM scraper
  content.test.ts   # unit tests for the scraper
  icon.svg          # or icon.png
  mock-site/
    index.html      # minimal HTML that mimics the real site's account DOM
```

#### 2. Define plugin metadata (`index.ts`)

```ts
import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "mybroker",
  name: "My Broker",
  icon,
  kind: "content",
  urlPatterns: [
    "https://www.mybroker.com/accounts/*",
    ...(__E2E__ ? ["http://localhost:3000/mybroker/*"] : []),
  ],
};

export default plugin;
```

The E2E conditional adds the mock-site URL only in test builds.

#### 3. Write the DOM scraper (`content.ts`)

```ts
import mybroker from "./index";
import { parseMoney, queryDeep, createMain } from "../content-utils";

export function extractPortfolio() {
  return queryDeep(".account-row").flatMap((row) => {
    const name = row.querySelector(".account-name")?.textContent?.trim();
    const balance = parseMoney(
      row.querySelector(".balance")?.textContent?.trim() ?? null,
    );
    if (!name || balance === null) return [];
    return [{ name, balance }];
  });
}

export const main = createMain(mybroker.id, extractPortfolio);
```

`parseMoney` strips `$` and `,` and returns a number. `queryDeep` recursively searches shadow DOM. `createMain` wires up the background message listener.

#### 4. Create the mock site (`mock-site/index.html`)

The mock site must reproduce just the CSS selectors your scraper targets, with fake dollar amounts in the $1–2k range:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Mock My Broker</title>
  </head>
  <body>
    <div class="account-row">
      <span class="account-name">Brokerage Account</span>
      <span class="balance">$1,350.00</span>
    </div>
  </body>
</html>
```

#### 5. Register the plugin

**`plugins/index.ts`** — add the import and include it in `PLUGINS`:

```ts
import mybroker from "./mybroker";

export const PLUGINS: SourcePlugin[] = [vanguard, alight, ynab, mybroker];
```

**`entrypoints/plugin.content.ts`** — add the content handler:

```ts
import { main as mybrokerMain } from "~/plugins/mybroker/content";

const handlers: Record<string, () => void> = {
  vanguard: vanguardMain,
  alight: alightMain,
  mybroker: mybrokerMain,
};
```

#### 6. Register the mock site for e2e tests

**`e2e/mock-sites/vite.config.ts`** — add the route and build input:

```ts
const mockSiteRoutes: Record<string, string> = {
  "/vanguard/": resolve(projectRoot, "plugins/vanguard/mock-site/index.html"),
  "/alight/":   resolve(projectRoot, "plugins/alight/mock-site/index.html"),
  "/mybroker/": resolve(projectRoot, "plugins/mybroker/mock-site/index.html"),
};

// and in build.rollupOptions.input:
mybroker: resolve(projectRoot, "plugins/mybroker/mock-site/index.html"),
```

#### 7. Write e2e tests

Add cases to `e2e/mock-sites.spec.ts` following the existing pattern:

```ts
test("refreshes My Broker accounts from mock tab", async ({
  context,
  popupBaseUrl,
}) => {
  await context
    .newPage()
    .then((p) => p.goto("http://localhost:3000/mybroker/"));
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  await popup.getByRole("button", { name: /↻ My Broker/ }).click();
  await expect(popup.getByText("Brokerage Account")).toBeVisible({
    timeout: 10_000,
  });
});
```

---

### Adding an API plugin

API plugins don't need a content script or mock site — the background service worker calls `refresh()` directly with the user's stored credentials.

#### 1. Create the plugin directory

```
plugins/<id>/
  index.ts          # plugin metadata + refresh()
  index.test.ts     # unit tests (mock fetch)
  icon.svg          # or icon.png
```

#### 2. Define plugin metadata and `refresh()` (`index.ts`)

```ts
import icon from "./icon.svg";
import type { Account } from "~/types";
import type { SourcePlugin } from "../index";

export async function refresh(
  creds: Record<string, string>,
): Promise<Account[]> {
  const token = creds.accessToken?.trim();
  if (!token) throw new Error("Access token is not set.");

  const res = await fetch("https://api.mybroker.com/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    throw new Error("MyBroker rejected the token. Check that it's valid.");
  }
  if (!res.ok) {
    throw new Error(`MyBroker API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.accounts.map((a: any) => ({
    name: a.name,
    balance: a.balance,
    accountId: a.id,
  }));
}

const plugin: SourcePlugin = {
  id: "mybroker",
  name: "My Broker",
  icon,
  kind: "api",
  hint: "Add your MyBroker API token in Settings, then click ↻ My Broker.",
  credentials: [
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "password",
      help: "Generate one in MyBroker → Settings → Developer.",
    },
  ],
  refresh,
};

export default plugin;
```

Each entry in `credentials` becomes an input field in the extension's Settings panel automatically — no UI code needed. The background worker loads the saved values from `chrome.storage.local` and passes them to `refresh()`.

#### 3. Write unit tests (`index.test.ts`)

Mock `global.fetch` and cover the branches that matter: missing/empty token, 401, other non-OK status, and successful parsing. See `plugins/ynab/index.test.ts` for a full example.

#### 4. Register the plugin

**`plugins/index.ts`** — add the import and include it in `PLUGINS`:

```ts
import mybroker from "./mybroker";

export const PLUGINS: SourcePlugin[] = [vanguard, alight, ynab, mybroker];
```

That's it — no content-script handler, no mock site, no `plugin.content.ts` changes. The background worker auto-detects `kind: "api"` and calls `refresh()` when the user clicks the refresh button.

#### 5. Write e2e tests

Use Playwright's `context.route()` to intercept the API call in the service worker and return a canned response. See the YNAB cases in `e2e/` for the pattern.

## Commit conventions

Lowercase imperative prefix:

```
feat:   new feature or plugin
fix:    bug fix
docs:   README or comment changes
ci:     GitHub Actions changes
chore:  dependency updates, config tweaks
```
