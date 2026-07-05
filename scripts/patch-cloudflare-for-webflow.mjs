/**
 * Webflow Cloud copies dist/client → /output/assets/<mount>. The Cloudflare
 * adapter (≥13.3.1) nests client output under dist/client/<base>/ so Workers
 * ASSETS binding resolves /mount/_astro correctly — but Webflow's CDN copy
 * then serves /mount/mount/_astro. Skip adapter nesting so CDN paths match HTML.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MARKER = "/* webflow-cloud: flat client dir for CDN asset copy */";
const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../node_modules/@astrojs/cloudflare/dist/index.js",
);

let source;
try {
  source = readFileSync(target, "utf8");
} catch {
  console.warn("patch-cloudflare-for-webflow: @astrojs/cloudflare not installed, skipping");
  process.exit(0);
}

if (source.includes(MARKER)) {
  process.exit(0);
}

const needle = `if (config.base !== "/") {
          config.build.client = new URL("." + config.base + "/", config.build.client);
        }`;

if (!source.includes(needle)) {
  console.warn(
    "patch-cloudflare-for-webflow: adapter layout changed; update scripts/patch-cloudflare-for-webflow.mjs",
  );
  process.exit(0);
}

const patched = source.replace(
  needle,
  `${MARKER}
        // Nested client dir breaks Webflow Cloud CDN copy (double mount prefix).
        if (false && config.base !== "/") {
          config.build.client = new URL("." + config.base + "/", config.build.client);
        }`,
);

writeFileSync(target, patched);
console.log("patch-cloudflare-for-webflow: applied flat client-dir patch");
