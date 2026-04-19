import icon from "./icon.png";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "alight",
  name: "Alight",
  icon,
  urlPatterns: [
    "https://worklife.alight.com/*",
    ...(__E2E__ ? ["http://localhost:3000/alight/*"] : []),
  ],
  hint: "Navigate to the retirement overview page, then click ↻ Alight.",
};

export default plugin;
