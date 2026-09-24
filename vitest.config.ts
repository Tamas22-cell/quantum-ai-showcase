import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone test config (the app's vite config loads SSR/worker plugins not needed for unit tests).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
