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

Plugins live in `plugins/<id>/`. Follow these steps using an existing plugin (e.g. `plugins/vanguard/`) as a reference.

### 1. Create the plugin directory

```
plugins/<id>/
  index.ts          # plugin metadata
  content.ts        # DOM scraper
  content.test.ts   # unit tests for the scraper
  icon.svg          # or icon.png
  mock-site/
    index.html      # minimal HTML that mimics the real site's account DOM
```

### 2. Define plugin metadata (`index.ts`)

```ts
import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "mybroker",
  name: "My Broker",
  icon,
  urlPatterns: [
    "https://www.mybroker.com/accounts/*",
    ...(__E2E__ ? ["http://localhost:3000/mybroker/*"] : []),
  ],
};

export default plugin;
```

The E2E conditional adds the mock-site URL only in test builds.

### 3. Write the DOM scraper (`content.ts`)

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

### 4. Create the mock site (`mock-site/index.html`)

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

### 5. Register the plugin

**`plugins/index.ts`** — add the import and include it in `PLUGINS`:

```ts
import mybroker from "./mybroker";

export const PLUGINS: SourcePlugin[] = [vanguard, alight, mybroker];
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

### 6. Register the mock site for e2e tests

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

### 7. Write e2e tests

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

## Commit conventions

Lowercase imperative prefix:

```
feat:   new feature or plugin
fix:    bug fix
docs:   README or comment changes
ci:     GitHub Actions changes
chore:  dependency updates, config tweaks
```
