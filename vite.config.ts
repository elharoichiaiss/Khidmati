import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifestFilename: "manifest.json",
      manifest: {
        id: "/",
        name: "Khidmati - Services Marketplace",
        short_name: "Khidmati",
        description: "Khidmati - منصة الخدمات المنزلية والمهنية بالمغرب",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#00B3BC",
        background_color: "#FFFFFF",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        importScripts: ['/custom-sw.js']
      }
    }),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: [
      {
        find: "@heroui/theme",
        replacement: path.resolve(import.meta.dirname, "node_modules/@heroui/theme"),
      },
      {
        find: "@heroui/shared-utils",
        replacement: path.resolve(import.meta.dirname, "node_modules/@heroui/shared-utils"),
      },
      {
        find: "@heroui/system",
        replacement: path.resolve(import.meta.dirname, "node_modules/@heroui/system"),
      },
      {
        find: "@",
        replacement: path.resolve(import.meta.dirname, "client", "src"),
      },
      {
        find: "@shared",
        replacement: path.resolve(import.meta.dirname, "shared"),
      },
      {
        find: "@assets",
        replacement: path.resolve(import.meta.dirname, "attached_assets"),
      },
    ],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || `http://localhost:${process.env.PORT || 5000}`,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
