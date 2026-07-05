import { defineMiddleware } from "astro:middleware";

import { runWithRuntimeEnv } from "./lib/env";

/**
 * Webflow Cloud injects secrets at runtime via Cloudflare bindings
 * (`locals.runtime.env`), not via import.meta.env. Propagate them into
 * readEnv() for the duration of each request.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const env = (context.locals.runtime?.env ?? {}) as Record<string, string | undefined>;
  return runWithRuntimeEnv(env, () => next());
});
