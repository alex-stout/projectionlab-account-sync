import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const projectRoot = resolve(__dirname, "../..");

const mockSiteRoutes: Record<string, string> = {
	"/vanguard/": resolve(projectRoot, "plugins/vanguard/mock-site/index.html"),
	"/alight/": resolve(projectRoot, "plugins/alight/mock-site/index.html"),
	"/monarch/": resolve(projectRoot, "plugins/monarch/mock-site/index.html"),
};

export default defineConfig({
	root: __dirname,
	plugins: [
		{
			name: "mock-site-routes",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const url = req.url ?? "";
					const normalized = url.endsWith("/") ? url : `${url}/`;
					const file = mockSiteRoutes[url] ?? mockSiteRoutes[normalized];
					if (file) {
						res.setHeader("Content-Type", "text/html");
						res.end(readFileSync(file, "utf-8"));
						return;
					}
					next();
				});
			},
		},
	],
	server: { port: 3000 },
	build: {
		rollupOptions: {
			input: {
				vanguard: resolve(projectRoot, "plugins/vanguard/mock-site/index.html"),
				alight: resolve(projectRoot, "plugins/alight/mock-site/index.html"),
				monarch: resolve(projectRoot, "plugins/monarch/mock-site/index.html"),
				projectionlab: resolve(__dirname, "projectionlab/index.html"),
			},
		},
	},
});
