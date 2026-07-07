/**
 * Webflow Data API configuration.
 *
 * Values come from environment variables so the same code runs in the build
 * script (Node + `--env-file`), local Astro dev (`.env`), and Webflow Cloud
 * (`locals.runtime.env` via middleware).
 */

import { readEnv } from "../env";

export { readEnv };

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

/** Defaults for the Anderson Group Webflow site (see README). */
const DEFAULTS = {
  siteId: "6a3ee562ea51d6c9ddc156c7",
  collections: {
    agents: "6a3eeb88509425ae62309159",
    areas: "6a3ee7398f36f58b907d2df1",
    specialties: "6a3ee77638f548e2e9600bb7",
  },
} as const;

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
