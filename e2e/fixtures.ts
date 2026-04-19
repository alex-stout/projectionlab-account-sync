import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

type Fixtures = {
  context: BrowserContext;
  extensionId: string;
  popupBaseUrl: string;
};

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const extPath = path.resolve(".output/chrome-mv3");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let background = context.serviceWorkers()[0];
    if (!background) background = await context.waitForEvent("serviceworker");
    await use(background.url().split("/")[2]);
  },

  popupBaseUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}`);
  },
});

export const expect = test.expect;
