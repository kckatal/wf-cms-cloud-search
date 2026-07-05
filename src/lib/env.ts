/**
 * Environment variable access for Node (build scripts), local Astro dev (.env),
 * and Webflow Cloud / Cloudflare Workers (runtime bindings via middleware).
 */

import { AsyncLocalStorage } from "node:async_hooks";

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv = new AsyncLocalStorage<RuntimeEnv>();

/** Called from middleware on each request to expose Webflow Cloud env bindings. */
export function runWithRuntimeEnv<T>(env: RuntimeEnv, fn: () => T): T {
  return runtimeEnv.run(env, fn);
}

/**
 * Read an env var from whichever runtime we're in.
 *
 * Priority:
 * 1. `locals.runtime.env` (Webflow Cloud / wrangler dev — set per-request by middleware)
 * 2. `process.env` (Node build scripts with `--env-file`)
 * 3. `import.meta.env` (local Astro dev with `.env`)
 */
export function readEnv(name: string): string | undefined {
  const fromRuntime = runtimeEnv.getStore()?.[name];
  if (fromRuntime) return fromRuntime;

  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }

  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[name];
}
