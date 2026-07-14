import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

// https://astro.build/config
// Webflow Cloud replaces this file at build time; keep aligned with the official
// starter: https://github.com/Webflow-Examples/hello-world-astro
export default defineConfig({
  base: "CLOUD_MOUNT_PATH",
  output: "server",
  compressHTML: true,
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  // Behind Webflow Cloud, the Worker host differs from the browser Origin.
  // Trust X-Forwarded-Host so CSRF origin checks pass for multipart saves.
  // If Webflow replaces this file at build time, re-add this block (or use checkOrigin: false).
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: "anderson-group-stage.webflow.io", protocol: "https" },
      { hostname: "**.webflow.io", protocol: "https" },
    ],
  },
  vite: {
    resolve: {
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
});
