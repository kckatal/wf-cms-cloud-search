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
 * 2. Explicit runtime override (when passed from `locals.runtime.env`)
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

/** Resolve runtime env from Astro locals (middleware + Cloudflare binding). */
export function runtimeEnvFromLocals(
  locals: App.Locals,
): RuntimeEnv | undefined {
  if (locals.runtimeEnv && Object.keys(locals.runtimeEnv).length > 0) {
    return locals.runtimeEnv;
  }
  const bound = locals.runtime?.env as RuntimeEnv | undefined;
  return bound && Object.keys(bound).length > 0 ? bound : undefined;
}
