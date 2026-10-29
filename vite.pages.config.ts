import { copyFileSync, cpSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** GitHub project Pages serves the site under /<repo>/. */
const pagesBase = "/krasue-krahang/";

function pagesOutput(): Plugin {
  return {
    name: "pages-output",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? "dist-pages";
      const nested = join(dir, "pages", "index.html");
      const root = join(dir, "index.html");
      if (!existsSync(nested)) return;
      renameSync(nested, root);
      copyFileSync(root, join(dir, "404.html"));
    },
    closeBundle() {
      const dir = "dist-pages";
      mkdirSync(join(dir, "art"), { recursive: true });
      for (const file of ["krasue.webp", "krahang.webp", "poop.webp", "village-night.webp"]) {
        cpSync(join("public/art", file), join(dir, "art", file));
      }
      for (const file of ["favicon.svg", "og.jpg", "robots.txt", "x-banner.jpg", ".nojekyll"]) {
        cpSync(join("public", file), join(dir, file));
      }
    },
  };
}

export default defineConfig({
  base: pagesBase,
  publicDir: false,
  plugins: [tailwindcss(), pagesOutput(), viteReact()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: "pages/index.html",
    },
  },
});
