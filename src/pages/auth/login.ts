/**
 * GET /auth/login — redirect to Auth0 Universal Login.
 */

import type { APIRoute } from "astro";

import { getAuthConfig } from "../../lib/auth";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async () => {
  const { domain, clientId, callbackUrl } = getAuthConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "openid profile email",
  });

  return Response.redirect(`https://${domain}/authorize?${params}`);
};
