import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // The default worker pools crash on this Node/Vitest combination ("reading 'config'"); vmThreads is stable.
    // Load dependencies through Vite so React is not instantiated twice inside the VM context.
    server: { deps: { inline: [/@tanstack/, /@radix-ui/, /recharts/, /lucide-react/] } },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
