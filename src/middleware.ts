import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

import { setActiveRuntimeEnv, type RuntimeEnv } from "./lib/env";

/**
 * Webflow Cloud injects secrets at runtime via Cloudflare bindings.
 * Astro v6+ removed `locals.runtime.env` — use `cloudflare:workers` instead.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  setActiveRuntimeEnv(env as RuntimeEnv);
  try {
    return await next();
  } finally {
    setActiveRuntimeEnv(undefined);
  }
});
