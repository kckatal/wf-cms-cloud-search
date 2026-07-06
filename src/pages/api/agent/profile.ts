/**
 * GET  /api/agent/profile — load the authenticated agent's editable profile.
 * PATCH /api/agent/profile — update the authenticated agent's CMS item.
 */

import type { APIRoute } from "astro";

import { jsonResponse, requireLinkedAgent, requireSession } from "../../../lib/auth/guard";
import { agentToProfileView, parseProfileUpdate } from "../../../lib/profile/fields";
import { invalidateIndex } from "../../../lib/search";
import {
  fetchAgentById,
  fetchTaxonomyOptions,
  updateAgentProfile,
} from "../../../lib/webflow/agents";

export const prerender = false;
export const config = { runtime: "edge" };

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const fieldData = parseProfileUpdate(body);
  if (!fieldData) {
    return jsonResponse({ error: "Invalid body", message: "No valid fields to update." }, 400);
  }

  try {
    const updated = await updateAgentProfile(agentId, fieldData);
    invalidateIndex();

    const options = await fetchTaxonomyOptions();
    return jsonResponse({ profile: agentToProfileView(updated), options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "profile_update_failed", message }, 500);
  }
};
