import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, requests to /api are forwarded to the backend (started by `npm run dev` in the main folder).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:4000", changeOrigin: true } }
  }
});
