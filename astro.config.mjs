import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

// https://astro.build/config
//
// `CLOUD_MOUNT_PATH` is replaced by Webflow Cloud's builder with your mount path
// (e.g. /find-an-agent). Do not hardcode the mount path or set build.assetsPrefix.
export default defineConfig({
  base: "CLOUD_MOUNT_PATH",
  output: "server",
  compressHTML: true,
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: "cloudflare-binding",
  }),
  integrations: [react()],
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
