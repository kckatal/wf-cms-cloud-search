/**
 * GET /auth/callback — exchange Auth0 authorization code for an ID token
 * and store it in an httpOnly session cookie.
 */

import type { APIRoute } from "astro";

import { appPath } from "../../lib/app-path";
import { getAuthConfig } from "../../lib/auth";
import { getAuthCookieName, getSessionMaxAge } from "../../lib/auth/session";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const loginPath = appPath("login");

  if (!code) {
    return redirect(`${loginPath}?error=missing_code`);
  }

  const { domain, clientId, clientSecret, callbackUrl } = getAuthConfig();

  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Auth0 token exchange failed:", await tokenRes.text());
    return redirect(`${loginPath}?error=auth_failed`);
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) {
    return redirect(`${loginPath}?error=no_token`);
  }

  cookies.set(getAuthCookieName(), tokens.id_token, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: getSessionMaxAge(),
  });

  return redirect(loginPath);
};
