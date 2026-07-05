import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare"; // Import the Cloudflare adapter
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({

// Server you app and assets from the correct mount path
  base: "CLOUD_MOUNT_PATH",
  // build: {
  //   assetsPrefix: "CLOUD_MOUNT_PATH",
  // },
  output: "server", // Use the server output mode

  // Use the Cloudflare adapter
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: 'cloudflare-binding'
  }),

// Enable React components
  integrations: [react()],

  // Optimize the build configuration for the Edge runtime
  vite: {
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
});

