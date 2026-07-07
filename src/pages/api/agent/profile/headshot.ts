/**
 * POST /api/agent/profile/headshot — upload and publish a new profile photo.
 * Prefer PATCH /api/agent/profile with multipart (headshot + fields in one request).
 */

import type { APIRoute } from "astro";

import { jsonResponse, requireLinkedAgent, requireSession } from "../../../../lib/auth/guard";
import {
  applyAgentProfileUpdate,
  buildHeadshotFieldData,
  ProfileUpdateError,
} from "../../../../lib/profile/update";

export const prerender = false;
export const config = { runtime: "edge" };

export const POST: APIRoute = async ({ request }) => {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const agentId = requireLinkedAgent(session);
  if (agentId instanceof Response) return agentId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "Invalid form data" }, 400);
  }

  const file = formData.get("headshot");
  if (!(file instanceof File) || file.size === 0) {
    return jsonResponse({ error: "Missing headshot file" }, 400);
  }

  try {
    const fieldData = await buildHeadshotFieldData(agentId, file);
    const result = await applyAgentProfileUpdate({ agentId, session, fieldData });
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof ProfileUpdateError) {
      return jsonResponse({ error: err.code, message: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "headshot_upload_failed", message }, 500);
  }
};
