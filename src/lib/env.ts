/**
 * Environment variable access for Node (build scripts), local Astro dev (.env),
 * and Webflow Cloud / Cloudflare Workers (runtime bindings via middleware).
 */

export type RuntimeEnv = Record<string, string | undefined>;

/** Set per-request by middleware while handling a Webflow Cloud request. */
let activeRuntimeEnv: RuntimeEnv | undefined;

export function setActiveRuntimeEnv(env: RuntimeEnv | undefined): void {
  activeRuntimeEnv = env;
}

/**
 * Read an env var from whichever runtime we're in.
 *
 * Priority:
 * 1. Active request env (Webflow Cloud / wrangler — set by middleware)
 * 2. Explicit runtime override (optional second argument)
 * 3. `process.env` (Node build scripts with `--env-file`)
 * 4. `import.meta.env` (local Astro dev with `.env`)
 */
export function readEnv(name: string, runtime?: RuntimeEnv): string | undefined {
  const fromRuntime = runtime?.[name] ?? activeRuntimeEnv?.[name];
  if (fromRuntime) return fromRuntime;

  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }

  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[name];
}
