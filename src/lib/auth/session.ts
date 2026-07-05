/**
 * Auth0 session helpers — JWT verification and cookie parsing.
 *
 * Uses `jose` for Cloudflare Workers / edge compatibility.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { getAuthConfig } from "./config";

const AUTH_COOKIE = "auth_token";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const { domain } = getAuthConfig();
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }
  return jwks;
}

export interface AuthSession {
  sub: string;
  email?: string;
  name?: string;
  /** Custom namespace claim injected by Auth0 Actions (Phase 2). */
  roles?: string[];
  /** Linked agent CMS item ID (Phase 2). */
  agentId?: string;
  payload: JWTPayload;
}

export function getAuthCookieName(): string {
  return AUTH_COOKIE;
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

export function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === AUTH_COOKIE && rest.length > 0) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { domain, clientId } = getAuthConfig();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `https://${domain}/`,
    audience: clientId,
  });
  return payload;
}

function readRoles(payload: JWTPayload): string[] | undefined {
  const { claimsNamespace } = getAuthConfig();
  const claim =
    payload[`${claimsNamespace}/roles`] ??
    payload["https://anderson-group-stage.webflow.io/roles"] ??
    payload["https://woodlandproperties.com/roles"] ??
    payload.roles ??
    payload[`${claimsNamespace}/role`] ??
    payload["https://woodlandproperties.com/role"];

  if (Array.isArray(claim)) return claim.map(String);
  if (typeof claim === "string") return [claim];
  return undefined;
}

function readAgentId(payload: JWTPayload): string | undefined {
  const { claimsNamespace } = getAuthConfig();
  const claim =
    payload[`${claimsNamespace}/agent_id`] ??
    payload["https://anderson-group-stage.webflow.io/agent_id"] ??
    payload["https://woodlandproperties.com/agent_id"] ??
    payload.agent_id;

  return typeof claim === "string" ? claim : undefined;
}

export async function getSessionFromToken(token: string): Promise<AuthSession> {
  const payload = await verifyToken(token);

  return {
    sub: String(payload.sub ?? ""),
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    roles: readRoles(payload),
    agentId: readAgentId(payload),
    payload,
  };
}

export async function getSessionFromRequest(
  cookieHeader: string | null,
): Promise<AuthSession | null> {
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token) return null;

  try {
    return await getSessionFromToken(token);
  } catch {
    return null;
  }
}

export function isAdmin(session: AuthSession): boolean {
  return session.roles?.includes("admin") ?? false;
}

export function isAgent(session: AuthSession): boolean {
  return session.roles?.includes("agent") ?? false;
}
