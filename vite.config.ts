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
    // On Vercel, let the Vercel preset own its output (.vercel/output). Overriding
    // output.dir there makes Vercel find no functions/static files and 404 every URL.
    // Elsewhere (Lovable preview) emit to dist/.
    nitro(process.env.VERCEL ? {} : { output: { dir: "dist" } }),
    viteReact(),
  ],
});
