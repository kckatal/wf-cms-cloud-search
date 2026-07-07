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

  const fieldData = parseProfileUpdate(body);
  if (!fieldData) return null;
  return { fieldData, headshotFile: null };
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
