import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * SPA-only build for the Capacitor iOS (and later Android) shell.
 * Skips the Cloudflare Vite plugin so `dist-native/` is static files.
 * API calls go to VITE_API_BASE (see `.env.native`).
 */
export default defineConfig({
  plugins: [react()],
  base: "./",
  envPrefix: "VITE_",
  build: {
    outDir: "dist-native",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
