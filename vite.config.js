import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "El Castaño · Vendedores",
        short_name: "El Castaño",
        description: "Pedidos, objetivos y stock para la red de vendedores de El Castaño",
        theme_color: "#B5542A",
        background_color: "#EFE9DC",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: ({ url }) => url.hostname.endsWith("supabase.co"), handler: "NetworkOnly" },
          { urlPattern: ({ url }) => url.hostname.endsWith("script.google.com"), handler: "NetworkOnly" },
        ],
      },
    }),
  ],
});
