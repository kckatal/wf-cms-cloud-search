/**
 * GET  /api/agent/profile — load the authenticated agent's editable profile.
 * PATCH /api/agent/profile — update fields and/or headshot (JSON or multipart).
 */

import type { APIRoute } from "astro";

import { jsonResponse, requireLinkedAgent, requireSession } from "../../../lib/auth/guard";
import {
  agentToProfileView,
  parseProfileUpdate,
  parseProfileUpdateFromFormData,
} from "../../../lib/profile/fields";
import {
  applyAgentProfileUpdate,
  buildHeadshotFieldData,
  ProfileUpdateError,
} from "../../../lib/profile/update";
import { fetchAgentById, fetchTaxonomyOptions } from "../../../lib/webflow/agents";
import type { AgentFields } from "../../../lib/webflow/types";

export const prerender = false;
export const config = { runtime: "edge" };

async function parsePatchBody(
  request: Request,
): Promise<{ fieldData: Partial<AgentFields>; headshotFile: File | null } | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fieldData = parseProfileUpdateFromFormData(formData) ?? {};

    const headshot = formData.get("headshot");
    const headshotFile =
      headshot instanceof File && headshot.size > 0 ? headshot : null;

    if (Object.keys(fieldData).length === 0 && !headshotFile) return null;
    return { fieldData, headshotFile };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  // Prefer JSON in production: Astro CSRF only blocks form/multipart content types.
  const fieldData = parseProfileUpdate(body) ?? {};
  const headshotFile = headshotFileFromJsonBody(body);

  if (Object.keys(fieldData).length === 0 && !headshotFile) return null;
  return { fieldData, headshotFile };
}

/** Optional headshot as base64 so saves can use application/json (avoids CSRF 403). */
function headshotFileFromJsonBody(body: unknown): File | null {
  if (body == null || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;
  const base64 = input.headshotBase64;
  if (typeof base64 !== "string" || base64.length === 0) return null;

  const contentType =
    typeof input.headshotContentType === "string" && input.headshotContentType
      ? input.headshotContentType
      : "application/octet-stream";

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], "headshot", { type: contentType });
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const agentId = requireLinkedAgent(session);
  if (agentId instanceof Response) return agentId;

  try {
    const [agent, options] = await Promise.all([
      fetchAgentById(agentId),
      fetchTaxonomyOptions(),
    ]);

    if (!agent) {
      return jsonResponse({ error: "Not found", message: "Agent CMS item not found." }, 404);
    }

    return jsonResponse({ profile: agentToProfileView(agent), options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "profile_load_failed", message }, 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const agentId = requireLinkedAgent(session);
  if (agentId instanceof Response) return agentId;

  let parsed: { fieldData: Partial<AgentFields>; headshotFile: File | null } | null;
  try {
    parsed = await parsePatchBody(request);
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (!parsed) {
    return jsonResponse({ error: "Invalid body", message: "No valid fields to update." }, 400);
  }

  try {
    const fieldData = { ...parsed.fieldData };

    if (parsed.headshotFile) {
      Object.assign(fieldData, await buildHeadshotFieldData(agentId, parsed.headshotFile));
    }

    const result = await applyAgentProfileUpdate({ agentId, session, fieldData });
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof ProfileUpdateError) {
      return jsonResponse({ error: err.code, message: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "profile_update_failed", message }, 500);
  }
};
