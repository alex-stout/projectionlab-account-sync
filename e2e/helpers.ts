import type { BrowserContext, Page, Worker } from "@playwright/test";

export async function getServiceWorker(
  context: BrowserContext,
): Promise<Worker> {
  const sw = context.serviceWorkers()[0];
  return sw ?? (await context.waitForEvent("serviceworker"));
}

export async function clearStorage(sw: Worker): Promise<void> {
  await sw.evaluate(() => (globalThis as any).chrome.storage.local.clear());
}

export async function seedStorage(
  sw: Worker,
  data: Record<string, unknown>,
): Promise<void> {
  await sw.evaluate(
    (d) => (globalThis as any).chrome.storage.local.set(d),
    data,
  );
}

export async function getStorage(
  sw: Worker,
  keys: string | string[],
): Promise<Record<string, unknown>> {
  return sw.evaluate(
    (k) => (globalThis as any).chrome.storage.local.get(k),
    keys,
  );
}

export async function openPopup(
  context: BrowserContext,
  popupBaseUrl: string,
): Promise<Page> {
  const popup = await context.newPage();
  await popup.goto(`${popupBaseUrl}/popup.html`);
  return popup;
}

export async function openMockTab(
  context: BrowserContext,
  url: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  return page;
}
