import icon from "./icon.png";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "alight",
  name: "Alight",
  icon,
  kind: "content",
  urlPatterns: [
    "https://worklife.alight.com/*",
    /* v8 ignore start -- E2E-only URL, covered by the mock-site E2E suite. */
    ...(__E2E__ ? ["http://localhost:3000/alight/*"] : []),
    /* v8 ignore stop */
  ],
  hint: "Navigate to the retirement overview page, then click ↻ Alight.",
};

export default plugin;
