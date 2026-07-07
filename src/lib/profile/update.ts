/**
 * Shared profile save pipeline: CMS update, search invalidation, audit log.
 */

import type { AuthSession } from "../auth/session";
import { appendChangelogEntry, diffProfileChanges } from "../changelog";
import type { AgentFields } from "../webflow/types";
import {
  fetchAgentById,
  fetchTaxonomyOptions,
  updateAgentProfile,
  type TaxonomyOption,
} from "../webflow/agents";
import { uploadSiteAsset } from "../webflow/assets";
import { invalidateIndex } from "../search";
import { agentToProfileView, type AgentProfileView } from "./fields";
import { validateHeadshotFile } from "./headshot";

export interface ApplyProfileUpdateInput {
  agentId: string;
  session: AuthSession;
  fieldData: Partial<AgentFields>;
}

export interface ApplyProfileUpdateResult {
  profile: AgentProfileView;
  options: { areas: TaxonomyOption[]; specialties: TaxonomyOption[] };
}

/** Upload a headshot asset and return CMS fieldData ready to merge into an update. */
export async function buildHeadshotFieldData(
  agentId: string,
  file: File,
): Promise<Partial<AgentFields>> {
  const agent = await fetchAgentById(agentId);
  if (!agent) {
    throw new ProfileUpdateError("Not found", "Agent CMS item not found.", 404);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateHeadshotFile(bytes, file.type || "application/octet-stream");
  if (!validation.ok) {
    throw new ProfileUpdateError("invalid_headshot", validation.message, 400);
  }

  const fileName = `${agent.slug}-headshot${validation.extension}`;
  const headshot = await uploadSiteAsset(bytes, fileName, validation.contentType);
  headshot.alt = agent.name;

  return { headshot };
}

export class ProfileUpdateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ProfileUpdateError";
  }
}

/**
 * Apply a CMS field update for the authenticated agent: publish, invalidate search
 * cache, and append changelog entries for any changed fields.
 */
export async function applyAgentProfileUpdate(
  input: ApplyProfileUpdateInput,
): Promise<ApplyProfileUpdateResult> {
  const { agentId, session, fieldData } = input;

  if (Object.keys(fieldData).length === 0) {
    throw new ProfileUpdateError("Invalid body", "No valid fields to update.", 400);
  }

  const [beforeAgent, options] = await Promise.all([
    fetchAgentById(agentId),
    fetchTaxonomyOptions(),
  ]);

  if (!beforeAgent) {
    throw new ProfileUpdateError("Not found", "Agent CMS item not found.", 404);
  }

  const beforeProfile = agentToProfileView(beforeAgent);
  const updated = await updateAgentProfile(agentId, fieldData);
  invalidateIndex();

  const changes = diffProfileChanges(beforeProfile, fieldData, options);
  if (changes.length > 0) {
    await appendChangelogEntry({
      agentId,
      agentName: beforeProfile.name,
      agentSlug: beforeProfile.slug,
      userSub: session.sub,
      userEmail: session.email ?? null,
      userName: session.name ?? null,
      changes,
    });
  }

  return {
    profile: agentToProfileView(updated),
    options,
  };
}
