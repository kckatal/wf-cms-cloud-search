/**
 * Public Webflow site URLs (agent profile pages live on the main site, not the Cloud mount).
 */

import { readEnv } from "./env";

const DEFAULT_ORIGIN = "https://anderson-group-stage.webflow.io";

export function getPublicSiteOrigin(): string {
  return (readEnv("PUBLIC_SITE_URL") ?? DEFAULT_ORIGIN).replace(/\/$/, "");
}

/** e.g. https://anderson-group-stage.webflow.io/agents/kc-fletcher */
export function agentPublicProfileUrl(slug: string): string {
  return `${getPublicSiteOrigin()}/agents/${encodeURIComponent(slug)}`;
}
