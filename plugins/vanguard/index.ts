import type { SourcePlugin } from "../index";
import icon from "./icon.svg";

const plugin: SourcePlugin = {
	id: "vanguard",
	name: "Vanguard",
	icon,
	kind: "content",
	hint: "Navigate to the holdings tab, then click ↻ Vanguard.",
	urlPatterns: [
		"https://www.vanguard.com/en/investor/portfolio/investments/*",
		/* v8 ignore start -- E2E-only URL, covered by the mock-site E2E suite. */
		...(__E2E__ ? ["http://localhost:3000/vanguard/*"] : []),
		/* v8 ignore stop */
	],
};

export default plugin;
