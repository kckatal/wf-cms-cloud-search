/**
 * GET /auth/logout — clear the local session and end the Auth0 session.
 */

import type { APIRoute } from "astro";

import { appPath } from "../../lib/app-path";
import { getAuthConfig } from "../../lib/auth";
import { getAuthCookieName } from "../../lib/auth/session";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const { domain, clientId } = getAuthConfig();
  const loginPath = appPath("login");
  const returnTo = encodeURIComponent(new URL(loginPath, url).toString());
  const logoutUrl = `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${returnTo}`;

  cookies.delete(getAuthCookieName(), { path: "/" });

  return redirect(logoutUrl);
};
