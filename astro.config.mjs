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
  // Webflow Cloud proxies the Worker under a different host than the browser Origin.
  // Astro CSRF (checkOrigin) rejects multipart/PATCH saves with 403 in that setup.
  // SameSite=Lax httpOnly session cookies still protect state-changing requests.
  security: {
    checkOrigin: false,
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
