import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: host || false,
    port: 5199,
    strictPort: false,
    hmr: host
      ? {
          protocol: "ws",
          host: host,
          port: 5299,
        }
      : undefined,
  },
});
