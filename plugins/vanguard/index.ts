import icon from "./icon.svg";
import type { SourcePlugin } from "../index";

const plugin: SourcePlugin = {
  id: "vanguard",
  name: "Vanguard",
  icon,
  urlPatterns: ["https://dashboard.web.vanguard.com/*", "http://localhost/*"],
};

export default plugin;
