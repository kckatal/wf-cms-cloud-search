/**
 * GET /auth/logout — clear the local session and end the Auth0 session.
 */

import type { APIRoute } from "astro";

import { getAuthConfig, getLogoutReturnUrl } from "../../lib/auth/config";
import { getAuthCookieName } from "../../lib/auth/session";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const { domain, clientId } = getAuthConfig();
  const returnTo = getLogoutReturnUrl();
  const logoutUrl = `https://${domain}/v2/logout?client_id=${encodeURIComponent(clientId)}&returnTo=${encodeURIComponent(returnTo)}`;

  cookies.delete(getAuthCookieName(), { path: "/" });

  return redirect(logoutUrl);
};
