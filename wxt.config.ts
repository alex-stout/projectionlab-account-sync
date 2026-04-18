import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "YNAB Sync",
    version: "0.1.0",
    permissions: ["storage", "tabs", "activeTab", "scripting"],
    web_accessible_resources: [
      {
        resources: ["projectionlab-main.js"],
        matches: [
          "https://app.projectionlab.com/*",
          "https://ea.projectionlab.com/*",
          "https://preview.projectionlab.com/*",
        ],
      },
    ],
    host_permissions: [
      "https://api.youneedabudget.com/*",
      "https://app.projectionlab.com/*",
      "https://ea.projectionlab.com/*",
      "https://preview.projectionlab.com/*",
      "https://dashboard.web.vanguard.com/",
    ],
  },
  hooks: {
    "entrypoints:found": (_wxt, entrypoints) => {
      const filtered = entrypoints.filter((e) => !/\.test\.[jt]sx?$/.test(e.inputPath));
      entrypoints.splice(0, entrypoints.length, ...filtered);
    },
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
