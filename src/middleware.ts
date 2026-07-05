import { defineMiddleware } from "astro:middleware";

import { setActiveRuntimeEnv, type RuntimeEnv } from "./lib/env";

/**
 * Webflow Cloud injects secrets at runtime via Cloudflare bindings
 * (`locals.runtime.env`), not via import.meta.env. Bind them for the full
 * request lifecycle (including awaits) so readEnv() can see them.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const env = (context.locals.runtime?.env ?? {}) as RuntimeEnv;
  context.locals.runtimeEnv = env;
  setActiveRuntimeEnv(env);
  try {
    return await next();
  } finally {
    setActiveRuntimeEnv(undefined);
  }
});
