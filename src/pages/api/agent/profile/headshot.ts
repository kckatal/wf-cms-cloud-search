/**
 * POST /api/agent/profile/headshot — upload and publish a new profile photo.
 * multipart/form-data field: `headshot` (JPEG, PNG, or WebP, max 300 KB).
 */

import type { APIRoute } from "astro";

import { jsonResponse, requireLinkedAgent, requireSession } from "../../../../lib/auth/guard";
import { appendChangelogEntry } from "../../../../lib/changelog";
import { validateHeadshotFile } from "../../../../lib/profile/headshot";
import { agentToProfileView } from "../../../../lib/profile/fields";
import { invalidateIndex } from "../../../../lib/search";
import { uploadSiteAsset } from "../../../../lib/webflow/assets";
import { fetchAgentById, fetchTaxonomyOptions, updateAgentProfile } from "../../../../lib/webflow/agents";

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
  if (!(file instanceof File)) {
    return jsonResponse({ error: "Missing headshot file" }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateHeadshotFile(bytes, file.type || "application/octet-stream");
  if (!validation.ok) {
    return jsonResponse({ error: "invalid_headshot", message: validation.message }, 400);
  }

  try {
    const beforeAgent = await fetchAgentById(agentId);
    if (!beforeAgent) {
      return jsonResponse({ error: "Not found", message: "Agent CMS item not found." }, 404);
    }

    const beforeProfile = agentToProfileView(beforeAgent);
    const fileName = `${beforeAgent.slug}-headshot${validation.extension}`;

    const headshot = await uploadSiteAsset(bytes, fileName, validation.contentType);
    headshot.alt = beforeAgent.name;

    const updated = await updateAgentProfile(agentId, { headshot });
    invalidateIndex();

    const beforeUrl = beforeProfile.headshotUrl ?? "(none)";
    const afterUrl = headshot.url;

    if (beforeUrl !== afterUrl) {
      await appendChangelogEntry({
        agentId,
        agentName: beforeProfile.name,
        agentSlug: beforeProfile.slug,
        userSub: session.sub,
        userEmail: session.email ?? null,
        userName: session.name ?? null,
        changes: [
          {
            field: "headshot",
            label: "Profile photo",
            before: beforeUrl,
            after: afterUrl,
          },
        ],
      });
    }

    const options = await fetchTaxonomyOptions();
    return jsonResponse({ profile: agentToProfileView(updated), options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "headshot_upload_failed", message }, 500);
  }
};
