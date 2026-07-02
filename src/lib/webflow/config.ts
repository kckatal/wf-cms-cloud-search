/**
 * Webflow Data API configuration.
 *
 * Values come from environment variables so the same code runs in the build
 * script (Node + `--env-file`) and in Astro server routes. The collection /
 * site IDs default to the discovered "Woodland Properties" site, but every
 * value can be overridden via env.
 */

export const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

export interface WebflowConfig {
  apiToken: string;
  siteId: string;
  collections: {
    agents: string;
    areas: string;
    specialties: string;
  };
}

/** Defaults for the Woodland Properties site (see README). */
const DEFAULTS = {
  siteId: "6a3ee562ea51d6c9ddc156c7",
  collections: {
    agents: "6a3eeb88509425ae62309159",
    areas: "6a3ee7398f36f58b907d2df1",
    specialties: "6a3ee77638f548e2e9600bb7",
  },
} as const;

/**
 * Read an env var from whichever runtime we're in. The build script uses Node's
 * `process.env`; Astro server routes expose secrets on `import.meta.env`.
 */
export function readEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  // `import.meta.env` is an object at runtime in SSR; guard for the build script.
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[name];
}

let cached: WebflowConfig | null = null;

export function getConfig(): WebflowConfig {
  if (cached) return cached;

  const apiToken = readEnv("WEBFLOW_API_TOKEN");
  if (!apiToken) {
    throw new Error(
      "Missing WEBFLOW_API_TOKEN. Set it in .env (see .env.example) before fetching live data.",
    );
  }

  cached = {
    apiToken,
    siteId: readEnv("WEBFLOW_SITE_ID") ?? DEFAULTS.siteId,
    collections: {
      agents: readEnv("WEBFLOW_AGENTS_COLLECTION_ID") ?? DEFAULTS.collections.agents,
      areas: readEnv("WEBFLOW_AREAS_COLLECTION_ID") ?? DEFAULTS.collections.areas,
      specialties:
        readEnv("WEBFLOW_SPECIALTIES_COLLECTION_ID") ?? DEFAULTS.collections.specialties,
    },
  };

  return cached;
}
