// Builds a single self-contained HTML preview of the site: `node scripts/demo/build.mjs`
// Output: demo-dist/club-custom-demo.html (open it in a browser or publish it).
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const shim = (f) => path.join(root, "scripts/demo/shims", f);
const ALIASES = {
  "next/link": shim("link.tsx"),
  "next/navigation": shim("navigation.ts"),
  "@/components/SiteHeader": shim("site-header.tsx"),
  "@/lib/actions/quick": shim("quick-actions.ts"),
};

const js = await build({
  entryPoints: [path.join(root, "scripts/demo/main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  plugins: [
    {
      name: "demo-aliases",
      setup(b) {
        b.onResolve({ filter: /^(next\/link|next\/navigation|@\/components\/SiteHeader|@\/lib\/actions\/quick)$/ }, (a) => ({ path: ALIASES[a.path] }));
      },
    },
  ],
});

const cssIn = await readFile(path.join(root, "src/app/globals.css"), "utf8");
const css = await postcss([tailwind({ base: root })]).process(
  cssIn + `\n:root{--font-sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color-scheme:light}`,
  { from: path.join(root, "src/app/globals.css") },
);

const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>Club Custom</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800&family=Inter:wght@400..800&display=swap">
<style>${css.css}</style>
<div id="root"></div>
<script>${script}</script>
`;
await mkdir(path.join(root, "demo-dist"), { recursive: true });
await writeFile(path.join(root, "demo-dist/club-custom-demo.html"), html);
console.log(`demo-dist/club-custom-demo.html  ${(html.length / 1024).toFixed(0)} KB`);
