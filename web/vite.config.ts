import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset + data URLs relative so the static build works
// from any host or sub-path (Cloudflare Pages, GitHub Pages, etc.).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
