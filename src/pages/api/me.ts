/**
 * GET /api/me — return the authenticated user's profile from the session JWT.
 */

import type { APIRoute } from "astro";

import { getSessionFromRequest } from "../../lib/auth";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async ({ request }) => {
  const session = await getSessionFromRequest(request.headers.get("cookie"));

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response(
    JSON.stringify({
      sub: session.sub,
      email: session.email ?? null,
      name: session.name ?? null,
      roles: session.roles ?? [],
      agentId: session.agentId ?? null,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
};
