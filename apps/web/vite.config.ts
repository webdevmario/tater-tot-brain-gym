import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API target for the dev proxy. Override with API_URL when the default
// port is taken (e.g. the prod launchd service is already on :4000).
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      "/api": API_URL,
      "/uploads": API_URL,
      "/sounds": API_URL,
    },
  },
});
