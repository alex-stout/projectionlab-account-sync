import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "vanguard",
  name: "Vanguard",
  icon,
  urlPatterns: [
    "https://dashboard.web.vanguard.com/*",
    ...(__E2E__ ? ["http://localhost:3000/vanguard/*"] : []),
  ],
};

export default plugin;
