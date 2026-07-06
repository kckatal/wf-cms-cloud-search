/**
 * Agent profile fields agents may edit via the portal.
 * Keys are CMS field slugs; values are sent to the Webflow Data API as fieldData.
 */

import type { AgentFields } from "../webflow/types";

/** Client-facing profile shape (camelCase). */
export interface AgentProfileForm {
  phone: string | null;
  phoneLabel: string | null;
  streetAddress: string | null;
  cityStateZip: string | null;
  bio: string | null;
  brokerageName: string | null;
  licenseNumber: string | null;
  websiteName: string | null;
  websiteUrl: string | null;
  companyName: string | null;
  companyUrl: string | null;
  areaIds: string[];
  specialtyIds: string[];
}

export interface AgentProfileView extends AgentProfileForm {
  id: string;
  slug: string;
  name: string;
  areas: { id: string; name: string; slug: string }[];
  specialties: { id: string; name: string; slug: string }[];
}

const CMS_FIELD_MAP: Record<keyof Omit<AgentProfileForm, "areaIds" | "specialtyIds">, keyof AgentFields> = {
  phone: "phone",
  phoneLabel: "phone-label",
  streetAddress: "street-address",
  cityStateZip: "city-state-zip",
  bio: "bio",
  brokerageName: "brokerage-name",
  licenseNumber: "license-number",
  websiteName: "website-name",
  websiteUrl: "website-url",
  companyName: "company-name",
  companyUrl: "company-url",
};

function normalizeString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeIdList(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const ids = value.map(String).filter(Boolean);
  return ids;
}

/** Map denormalized agent data to the profile editor view. */
export function agentToProfileView(agent: {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  phoneLabel: string | null;
  streetAddress: string | null;
  cityStateZip: string | null;
  bioHtml: string | null;
  brokerageName: string | null;
  licenseNumber: string | null;
  websiteName: string | null;
  websiteUrl: string | null;
  companyName: string | null;
  companyUrl: string | null;
  areasServed: { id: string; name: string; slug: string }[];
  specialties: { id: string; name: string; slug: string }[];
}): AgentProfileView {
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    phone: agent.phone,
    phoneLabel: agent.phoneLabel,
    streetAddress: agent.streetAddress,
    cityStateZip: agent.cityStateZip,
    bio: agent.bioText ?? agent.bioHtml,
    brokerageName: agent.brokerageName,
    licenseNumber: agent.licenseNumber,
    websiteName: agent.websiteName,
    websiteUrl: agent.websiteUrl,
    companyName: agent.companyName,
    companyUrl: agent.companyUrl,
    areaIds: agent.areasServed.map((a) => a.id),
    specialtyIds: agent.specialties.map((s) => s.id),
    areas: agent.areasServed,
    specialties: agent.specialties,
  };
}

/**
 * Parse and whitelist a JSON body from PATCH /api/agent/profile.
 * Returns CMS fieldData ready for the Webflow API.
 */
export function parseProfileUpdate(body: unknown): Partial<AgentFields> | null {
  if (body == null || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;
  const fieldData: Partial<AgentFields> = {};

  for (const [formKey, cmsKey] of Object.entries(CMS_FIELD_MAP) as [
    keyof typeof CMS_FIELD_MAP,
    keyof AgentFields,
  ][]) {
    if (!(formKey in input)) continue;
    const value = normalizeString(input[formKey]);
    if (cmsKey === "bio") {
      fieldData.bio = value ? (value.startsWith("<") ? value : `<p>${escapeHtml(value)}</p>`) : null;
    } else {
      (fieldData as Record<string, string | null>)[cmsKey] = value;
    }
  }

  const areaIds = normalizeIdList(input.areaIds);
  if (areaIds) fieldData["areas-served"] = areaIds;

  const specialtyIds = normalizeIdList(input.specialtyIds);
  if (specialtyIds) fieldData.specialties = specialtyIds;

  return Object.keys(fieldData).length > 0 ? fieldData : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
