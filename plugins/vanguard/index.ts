import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "vanguard",
  name: "Vanguard",
  icon,
  kind: "content",
  urlPatterns: [
    "https://dashboard.web.vanguard.com/*",
    /* v8 ignore start -- E2E-only URL, covered by the mock-site E2E suite. */
    ...(__E2E__ ? ["http://localhost:3000/vanguard/*"] : []),
    /* v8 ignore stop */
  ],
};

export default plugin;
