/**
 * Auth helpers for protected API routes and pages.
 */

import type { AuthSession } from "./session";
import { getSessionFromRequest, isAdmin, isAgent } from "./session";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export async function requireSession(
  request: Request,
): Promise<AuthSession | Response> {
  const session = await getSessionFromRequest(request.headers.get("cookie"));
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return session;
}

/** Agents must have a linked CMS item ID from Auth0 app_metadata. */
export function requireLinkedAgent(session: AuthSession): string | Response {
  if (!isAgent(session)) {
    return jsonResponse({ error: "Forbidden", message: "Agent role required." }, 403);
  }
  if (!session.agentId) {
    return jsonResponse(
      { error: "Forbidden", message: "No agent profile linked to this account." },
      403,
    );
  }
  return session.agentId;
}

export function requireAdmin(session: AuthSession): true | Response {
  if (!isAdmin(session)) {
    return jsonResponse({ error: "Forbidden", message: "Admin role required." }, 403);
  }
  return true;
}
