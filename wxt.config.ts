import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const isE2E = process.env.E2E === "true";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "ProjectionLab Account Sync",
    version: "0.1.0",
    permissions: ["storage", "tabs", "activeTab"],
    browser_specific_settings: {
      gecko: {
        id: "projectionlab-account-sync@extension",
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: ["none"],
          optional: [],
        },
      },
    },
    web_accessible_resources: [
      {
        resources: ["projectionlab-main.js"],
        matches: [
          "https://app.projectionlab.com/*",
          "https://ea.projectionlab.com/*",
        ],
      },
    ],
    host_permissions: [
      "https://app.projectionlab.com/*",
      "https://ea.projectionlab.com/*",
      "https://dashboard.web.vanguard.com/*",
      "https://api.ynab.com/*",
      ...(isE2E ? ["http://localhost:3000/*"] : []),
    ],
  },
  hooks: {
    "entrypoints:found": (_wxt, entrypoints) => {
      const filtered = entrypoints.filter(
        (e) => !/\.test\.[jt]sx?$/.test(e.inputPath),
      );
      entrypoints.splice(0, entrypoints.length, ...filtered);
    },
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __E2E__: JSON.stringify(isE2E),
    },
  }),
});
