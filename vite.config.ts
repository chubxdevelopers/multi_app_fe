import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare tunnel hostname (NO protocol, only hostname)
const TUNNEL_HOST =
  process.env.VITE_TUNNEL_HOST ||
  process.env.TUNNEL_HOSTNAME ||
  "jewelry-shopping-dreams-learned.trycloudflare.com";

// Backend URL for proxying API requests
const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:4000";

export default defineConfig(() => ({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true,

    // Allow Cloudflare forwarded hostname
    allowedHosts: [TUNNEL_HOST],

    // Proxy API requests to backend
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      "/debug": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    },

    // Fix websocket HMR over Cloudflare
    hmr: {
      protocol: "wss",
      host: TUNNEL_HOST,
      clientPort: 443,
    },
  },
}));
