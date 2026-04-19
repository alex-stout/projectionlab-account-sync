import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  define: {
    __E2E__: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["entrypoints/**/*.{ts,tsx}", "plugins/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.content.ts",
        "entrypoints/popup/main.tsx",
      ],
      reporter: ["text", "html", "cobertura"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "."),
    },
  },
});
