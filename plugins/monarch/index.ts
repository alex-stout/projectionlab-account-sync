import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "monarch",
  name: "Monarch",
  icon,
  kind: "content",
  urlPatterns: [
    "https://app.monarch.com/*",
    /* v8 ignore start -- E2E-only URL, covered by the mock-site E2E suite. */
    ...(__E2E__ ? ["http://localhost:3000/monarch/*"] : []),
    /* v8 ignore stop */
  ],
  hint: "Navigate to the Accounts page, then click ↻ Monarch.",
};

export default plugin;
