import { copyFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** GitHub project Pages serves the site under /<repo>/. */
const pagesBase = "/krasue-krahang/";

function indexAtSiteRoot(): Plugin {
  return {
    name: "pages-index-at-site-root",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? "dist-pages";
      const nested = join(dir, "pages", "index.html");
      const root = join(dir, "index.html");
      if (!existsSync(nested)) return;
      renameSync(nested, root);
      copyFileSync(root, join(dir, "404.html"));
    },
  };
}

export default defineConfig({
  base: pagesBase,
  plugins: [tailwindcss(), indexAtSiteRoot(), viteReact()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: "pages/index.html",
    },
  },
});
