import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      // "prompt": el plugin no recarga la app por su cuenta; la recarga y el cartel de
      // actualización los maneja la propia app (así nunca se corta un pedido a medias).
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "El Castaño · Vendedores",
        short_name: "El Castaño",
        description: "Alimentos naturales · El Castaño",
        theme_color: "#003C69",
        background_color: "#FFFFFF",
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
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST",
      },
    }),
  ],
});
