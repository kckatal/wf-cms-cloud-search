import type { AgentProfileView } from "../profile/fields";
import type { AgentFields } from "../webflow/types";
import type { TaxonomyOption } from "../webflow/agents";
import type { ProfileChange } from "./types";

const FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  "phone-label": "Phone label",
  "street-address": "Street address",
  "city-state-zip": "City, state, zip",
  bio: "Bio",
  "brokerage-name": "Brokerage name",
  "license-number": "License number",
  "website-name": "Website name",
  "website-url": "Website URL",
  "company-name": "Company name",
  "company-url": "Company URL",
  "areas-served": "Areas served",
  specialties: "Specialties",
};

const PROFILE_VIEW_KEYS: Partial<Record<keyof AgentFields, keyof AgentProfileView>> = {
  phone: "phone",
  "phone-label": "phoneLabel",
  "street-address": "streetAddress",
  "city-state-zip": "cityStateZip",
  bio: "bio",
  "brokerage-name": "brokerageName",
  "license-number": "licenseNumber",
  "website-name": "websiteName",
  "website-url": "websiteUrl",
  "company-name": "companyName",
  "company-url": "companyUrl",
};

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "(empty)";
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

function idsToLabelList(ids: string[], lookup: Map<string, string>): string {
  if (ids.length === 0) return "(none)";
  return ids.map((id) => lookup.get(id) ?? id).join(", ");
}

function sortedIds(ids: string[]): string[] {
  return [...ids].sort();
}

function idsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = sortedIds(a);
  const sortedB = sortedIds(b);
  return sortedA.every((id, index) => id === sortedB[index]);
}

/** Build human-readable change records from a profile update payload. */
export function diffProfileChanges(
  before: AgentProfileView,
  fieldData: Partial<AgentFields>,
  options: { areas: TaxonomyOption[]; specialties: TaxonomyOption[] },
): ProfileChange[] {
  const changes: ProfileChange[] = [];
  const areaLookup = new Map(options.areas.map((a) => [a.id, a.name]));
  const specialtyLookup = new Map(options.specialties.map((s) => [s.id, s.name]));

  for (const [cmsKey, rawAfter] of Object.entries(fieldData) as [keyof AgentFields, unknown][]) {
    const label = FIELD_LABELS[cmsKey] ?? cmsKey;

    if (cmsKey === "areas-served") {
      const afterIds = Array.isArray(rawAfter) ? rawAfter.map(String) : [];
      if (idsEqual(before.areaIds, afterIds)) continue;
      changes.push({
        field: cmsKey,
        label,
        before: idsToLabelList(before.areaIds, areaLookup),
        after: idsToLabelList(afterIds, areaLookup),
      });
      continue;
    }

    if (cmsKey === "specialties") {
      const afterIds = Array.isArray(rawAfter) ? rawAfter.map(String) : [];
      if (idsEqual(before.specialtyIds, afterIds)) continue;
      changes.push({
        field: cmsKey,
        label,
        before: idsToLabelList(before.specialtyIds, specialtyLookup),
        after: idsToLabelList(afterIds, specialtyLookup),
      });
      continue;
    }

    const viewKey = PROFILE_VIEW_KEYS[cmsKey];
    if (!viewKey) continue;

    const beforeValue = before[viewKey];
    const beforeText = displayValue(typeof beforeValue === "string" ? beforeValue : null);

    let afterText: string;
    if (cmsKey === "bio") {
      afterText = displayValue(stripHtml(typeof rawAfter === "string" ? rawAfter : null));
    } else {
      afterText = displayValue(typeof rawAfter === "string" ? rawAfter : null);
    }

    if (beforeText === afterText) continue;

    changes.push({
      field: cmsKey,
      label,
      before: beforeText,
      after: afterText,
    });
  }

  return changes;
}
