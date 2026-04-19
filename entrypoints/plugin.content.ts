import "~/assets/tailwind.css";
import { PLUGINS, type ContentPlugin } from "~/plugins";
import { main as vanguardMain } from "~/plugins/vanguard/content";
import { main as alightMain } from "~/plugins/alight/content";

const CONTENT_PLUGINS = PLUGINS.filter(
  (p): p is ContentPlugin => p.kind === "content",
);

const handlers: Record<string, () => void> = {
  vanguard: vanguardMain,
  alight: alightMain,
};

export function matchesPattern(url: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
  );
  return regex.test(url);
}

export default defineContentScript({
  matches: CONTENT_PLUGINS.flatMap((p) => p.urlPatterns),
  main() {
    const plugin = CONTENT_PLUGINS.find((p) =>
      p.urlPatterns.some((pattern) => matchesPattern(location.href, pattern))
    );
    if (plugin) handlers[plugin.id]?.();
  },
});
