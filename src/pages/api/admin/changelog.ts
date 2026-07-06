/**
 * GET /api/admin/changelog — list profile edit audit entries (admin only).
 */

import type { APIRoute } from "astro";

import { jsonResponse, requireAdmin, requireSession } from "../../../lib/auth/guard";
import { listChangelogEntries } from "../../../lib/changelog";

export const prerender = false;
export const config = { runtime: "edge" };

export const GET: APIRoute = async ({ request, url }) => {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const adminCheck = requireAdmin(session);
  if (adminCheck instanceof Response) return adminCheck;

  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  try {
    const result = await listChangelogEntries({ limit, offset });
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "changelog_load_failed", message }, 500);
  }
};
