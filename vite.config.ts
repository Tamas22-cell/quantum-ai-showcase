import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    // On Vercel, emit the Build Output API layout to .vercel/output, where Vercel looks for it.
    // Writing it to dist/ there made Vercel find no functions/static files and 404 every URL.
    // Elsewhere (Lovable preview) emit to dist/.
    nitro({ output: { dir: process.env["VERCEL"] ? ".vercel/output" : "dist" } }),
    viteReact(),
  ],
});
