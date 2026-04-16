import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "YNAB Sync",
    version: "0.1.0",
    permissions: ["storage", "tabs", "activeTab"],
    host_permissions: [
      "https://api.youneedabudget.com/*",
      "https://projectionlab.com/*",
      "https://api.projectionlab.com/*",
      "https://dashboard.web.vanguard.com/",
    ],
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
