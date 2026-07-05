/**
 * Auth0 configuration for the Webflow Cloud app.
 *
 * Follows the server-side OAuth pattern from:
 * https://webflow.com/blog/auth0-authentication-webflow
 */

import { readEnv } from "../webflow/config";

export interface AuthConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  /** Namespace for custom JWT claims from Auth0 Actions. */
  claimsNamespace: string;
}

let cached: AuthConfig | null = null;

export function getAuthConfig(): AuthConfig {
  if (cached) return cached;

  const domain = readEnv("AUTH0_DOMAIN");
  const clientId = readEnv("AUTH0_CLIENT_ID");
  const clientSecret = readEnv("AUTH0_CLIENT_SECRET");
  const callbackUrl = readEnv("AUTH0_CALLBACK_URL");

  const missing = [
    !domain && "AUTH0_DOMAIN",
    !clientId && "AUTH0_CLIENT_ID",
    !clientSecret && "AUTH0_CLIENT_SECRET",
    !callbackUrl && "AUTH0_CALLBACK_URL",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing Auth0 env vars: ${missing.join(", ")}. See .env.example.`,
    );
  }

  cached = {
    domain: domain!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    callbackUrl: callbackUrl!,
    claimsNamespace:
      readEnv("AUTH0_CLAIMS_NAMESPACE") ?? "https://anderson-group-stage.webflow.io",
  };

  return cached;
}

/** Logout landing page — derived from callback URL unless overridden. */
export function getLogoutReturnUrl(config: AuthConfig = getAuthConfig()): string {
  const explicit = readEnv("AUTH0_LOGOUT_RETURN_URL");
  if (explicit) return explicit;

  const { callbackUrl } = config;
  if (callbackUrl.endsWith("/auth/callback")) {
    return `${callbackUrl.slice(0, -"/auth/callback".length)}/login`;
  }
  return callbackUrl.replace(/\/auth\/callback\/?$/, "/login");
}

/** True when all four Auth0 env vars are present (without throwing). */
export function isAuthConfigured(): boolean {
  return Boolean(
    readEnv("AUTH0_DOMAIN") &&
      readEnv("AUTH0_CLIENT_ID") &&
      readEnv("AUTH0_CLIENT_SECRET") &&
      readEnv("AUTH0_CALLBACK_URL"),
  );
}
