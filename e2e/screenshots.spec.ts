import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { clearStorage, getServiceWorker, seedStorage } from "./helpers";

/**
 * Helper script for generating screenshots
 */
const mins = (n: number) => Date.now() - n * 60 * 1000;

const DEMO_STATE = {
  plApiKey: "demo-key",
  plAccounts: [
    { id: "pl-1", name: "Roth IRA" },
    { id: "pl-2", name: "Taxable Brokerage" },
    { id: "pl-3", name: "401(k) Rollover" },
    { id: "pl-4", name: "HSA" },
    { id: "pl-5", name: "Checking" },
  ],
  plLastRefreshed: mins(3),
  accounts_vanguard: [
    { name: "Roth IRA — VTSAX", balance: 48250.12, accountId: "v-1" },
    { name: "Taxable — VTI", balance: 112800.44, accountId: "v-2" },
    { name: "Rollover IRA", balance: 217400.08, accountId: "v-3" },
  ],
  mappings_vanguard: { "v-1": "pl-1", "v-2": "pl-2", "v-3": "pl-3" },
  lastRefreshed_vanguard: mins(4),
  lastSynced_vanguard: mins(4),
  creds_ynab: { accessToken: "demo-token-placeholder" },
};

async function launchDemoContext(dsr = 2): Promise<BrowserContext> {
  const extPath = path.resolve(".output/chrome-mv3");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    deviceScaleFactor: dsr,
    viewport: { width: 460, height: 480 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
    ],
  });
  const sw = await getServiceWorker(context);
  await clearStorage(sw);
  await seedStorage(sw, DEMO_STATE);
  return context;
}

async function iconDataUri(): Promise<string> {
  const svg = await readFile("public/icon.svg", "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildSmallPromo(icon: string): string {
  return `<!doctype html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
  .tile {
    width: 440px; height: 280px;
    background: linear-gradient(135deg, #0b1120 0%, #1e1b4b 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; padding: 24px;
  }
  .icon { width: 72px; height: 72px; border-radius: 16px; }
  .title { color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; text-align: center; }
  .tagline { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500; text-align: center; line-height: 1.35; }
</style>
</head>
<body>
  <div class="tile">
    <img class="icon" src="${icon}" />
    <div class="title">ProjectionLab Account Sync</div>
    <div class="tagline">Sync balances from Vanguard, YNAB, and others</div>
  </div>
</body>
</html>`;
}

function buildMarqueePromo(icon: string, popupBase64: string): string {
  return `<!doctype html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
  .tile {
    width: 1400px; height: 560px;
    background: linear-gradient(135deg, #0b1120 0%, #1e1b4b 100%);
    display: flex; align-items: center; justify-content: center;
    gap: 80px; padding: 0 80px;
  }
  .content { display: flex; flex-direction: column; gap: 20px; max-width: 580px; }
  .icon { width: 72px; height: 72px; border-radius: 16px; }
  .title { color: white; font-size: 52px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .tagline { color: rgba(255,255,255,0.88); font-size: 20px; font-weight: 500; line-height: 1.45; }
  .popup {
    width: 460px; height: 480px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2), 0 25px 70px rgba(99, 102, 241, 0.25);
    display: block; flex-shrink: 0;
  }
</style>
</head>
<body>
  <div class="tile">
    <div class="content">
      <img class="icon" src="${icon}" />
      <div class="title">Keep ProjectionLab in sync</div>
      <div class="tagline">Sync account balances from Vanguard, YNAB, and others into your ProjectionLab plan — one click, no telemetry, no servers.</div>
    </div>
    <img class="popup" src="data:image/png;base64,${popupBase64}" />
  </div>
</body>
</html>`;
}

function buildStoreFrame(popupBase64: string, caption: string): string {
  return `<!doctype html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
  .frame {
    width: 1280px; height: 800px;
    background: linear-gradient(135deg, #0b1120 0%, #1e1b4b 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 48px;
  }
  .caption {
    color: white;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.015em;
    text-align: center;
    max-width: 900px;
    padding: 0 40px;
    line-height: 1.25;
  }
  .popup {
    width: 460px; height: 480px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2), 0 25px 70px rgba(99, 102, 241, 0.25);
    display: block;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="caption">${caption}</div>
    <img class="popup" src="data:image/png;base64,${popupBase64}" />
  </div>
</body>
</html>`;
}

test.describe("Screenshots", () => {
  test.skip(
    !process.env.SCREENSHOTS,
    "Set SCREENSHOTS=true or run `npm run screenshots`",
  );

  test("popup", async () => {
    const context = await launchDemoContext();
    try {
      const sw = await getServiceWorker(context);
      const extensionId = sw.url().split("/")[2];
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(page.getByText("Roth IRA — VTSAX")).toBeVisible();
      await page.screenshot({ path: "docs/popup.png" });
    } finally {
      await context.close();
    }
  });

  test("settings", async () => {
    const context = await launchDemoContext();
    try {
      const sw = await getServiceWorker(context);
      const extensionId = sw.url().split("/")[2];
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.getByTitle("Settings").click();
      await expect(page.getByText("ProjectionLab API Key")).toBeVisible();
      // Unfix body height so the full scrollable settings panel fits in one shot.
      await page.addStyleTag({
        content: "body, #root { height: auto !important; min-height: 480px; }",
      });
      await page.screenshot({ path: "docs/settings.png", fullPage: true });
    } finally {
      await context.close();
    }
  });

  test("chrome store shots", async () => {
    // CWS requires 1280x800 JPEG or 24-bit PNG (no alpha). Use DSR=1 for pixel-crisp
    // popup rendering at its natural 460x480 size inside the 1280x800 frame.
    const context = await launchDemoContext(1);
    try {
      await mkdir("docs/store", { recursive: true });
      const sw = await getServiceWorker(context);
      const extensionId = sw.url().split("/")[2];

      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(popup.getByText("Roth IRA — VTSAX")).toBeVisible();
      const mainShot = await popup.screenshot();

      await popup.getByTitle("Settings").click();
      await expect(popup.getByText("ProjectionLab API Key")).toBeVisible();
      const settingsShot = await popup.screenshot();
      await popup.close();

      const variants: {
        path: string;
        buffer: Buffer;
        caption: string;
      }[] = [
        {
          path: "docs/store/01-main.jpg",
          buffer: mainShot,
          caption: "Sync account balances into ProjectionLab with one click",
        },
        {
          path: "docs/store/02-settings.jpg",
          buffer: settingsShot,
          caption: "Your credentials stay local — no telemetry, no servers",
        },
      ];

      for (const v of variants) {
        const frame = await context.newPage();
        await frame.setViewportSize({ width: 1280, height: 800 });
        await frame.setContent(
          buildStoreFrame(v.buffer.toString("base64"), v.caption),
        );
        // JPEG guarantees 24-bit no-alpha output — CWS's strict requirement.
        await frame.screenshot({
          path: v.path,
          type: "jpeg",
          quality: 92,
        });
        await frame.close();
      }

      const icon = await iconDataUri();
      const promos: {
        path: string;
        width: number;
        height: number;
        html: string;
      }[] = [
        {
          path: "docs/store/promo-small.jpg",
          width: 440,
          height: 280,
          html: buildSmallPromo(icon),
        },
        {
          path: "docs/store/promo-marquee.jpg",
          width: 1400,
          height: 560,
          html: buildMarqueePromo(icon, mainShot.toString("base64")),
        },
      ];

      for (const p of promos) {
        const frame = await context.newPage();
        await frame.setViewportSize({ width: p.width, height: p.height });
        await frame.setContent(p.html);
        await frame.screenshot({ path: p.path, type: "jpeg", quality: 92 });
        await frame.close();
      }
    } finally {
      await context.close();
    }
  });
});
