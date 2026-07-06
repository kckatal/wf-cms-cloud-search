/**
 * Fetches agents from Webflow and denormalizes their `specialties` and
 * `areas-served` MultiReference fields into resolved name/slug objects.
 */

import { WebflowClient } from "./client";
import { getConfig } from "./config";
import type {
  Agent,
  AgentFields,
  RawCmsItem,
  TaxonomyFields,
  TaxonomyRef,
} from "./types";

/** Strip HTML tags and collapse whitespace from a RichText value. */
function htmlToText(html: string | null | undefined): string | null {
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

function resolveRefs(
  ids: string[] | null | undefined,
  lookup: Map<string, TaxonomyRef>,
): TaxonomyRef[] {
  if (!ids) return [];
  return ids.map((id) => lookup.get(id)).filter((ref): ref is TaxonomyRef => ref != null);
}

/** Build an id → ref lookup from raw taxonomy (Areas/Specialties) items. */
function taxonomyMap(items: RawCmsItem<TaxonomyFields>[]): Map<string, TaxonomyRef> {
  return new Map(
    items.map((item) => [
      item.id,
      { id: item.id, name: item.fieldData.name, slug: item.fieldData.slug },
    ]),
  );
}

/**
 * Pure denormalization: join raw agent items against area/specialty taxonomies.
 * Shared by {@link fetchAgents} (live) and the offline index seeder.
 */
export function mapAgents(
  agentItems: RawCmsItem<AgentFields>[],
  areaItems: RawCmsItem<TaxonomyFields>[],
  specialtyItems: RawCmsItem<TaxonomyFields>[],
): Agent[] {
  const areas = taxonomyMap(areaItems);
  const specialties = taxonomyMap(specialtyItems);

  return agentItems.map((item) => {
    const f = item.fieldData;
    return {
      id: item.id,
      slug: f.slug,
      name: f.name,
      headshotUrl: f.headshot?.url ?? null,
      headshotAlt: f.headshot?.alt ?? null,
      brokerageName: f["brokerage-name"] ?? null,
      companyName: f["company-name"] ?? null,
      yearsOfExperience: f["years-of-experience"] ?? null,
      rating: f.rating ?? null,
      reviewCount: f["review-count"] ?? null,
      recentSalesCount: f["recent-sales-count"] ?? null,
      priceRangeLow: f["price-range-low"] ?? null,
      priceRangeHigh: f["price-range-high"] ?? null,
      bioHtml: f.bio ?? null,
      bioText: htmlToText(f.bio),
      licenseNumber: f["license-number"] ?? null,
      phone: f.phone ?? null,
      phoneLabel: f["phone-label"] ?? null,
      streetAddress: f["street-address"] ?? null,
      cityStateZip: f["city-state-zip"] ?? null,
      websiteName: f["website-name"] ?? null,
      websiteUrl: f["website-url"] ?? null,
      companyUrl: f["company-url"] ?? null,
      partnerBadgeText: f["partner-badge-text"] ?? null,
      realtorBadge: f["realtor-badge"] ?? false,
      totalListings: f["total-listings"] ?? null,
      activeListingsCount: f["active-listings-count"] ?? null,
      rentListingsCount: f["rent-listings-count"] ?? null,
      workedWithSellerCount: f["worked-with-seller-count"] ?? null,
      specialties: resolveRefs(f.specialties, specialties),
      areasServed: resolveRefs(f["areas-served"], areas),
    } satisfies Agent;
  });
}

/**
 * Fetch all agents with their references resolved. Agents, areas, and
 * specialties are loaded in parallel, then joined in memory by {@link mapAgents}.
 */
export async function fetchAgents(client: WebflowClient = new WebflowClient()): Promise<Agent[]> {
  const { collections } = getConfig();

  const [agentItems, areaItems, specialtyItems] = await Promise.all([
    client.listAllItems<AgentFields>(collections.agents),
    client.listAllItems<TaxonomyFields>(collections.areas),
    client.listAllItems<TaxonomyFields>(collections.specialties),
  ]);

  return mapAgents(agentItems, areaItems, specialtyItems);
}

/** Fetch a single agent by CMS item ID with references resolved. */
export async function fetchAgentById(
  agentId: string,
  client: WebflowClient = new WebflowClient(),
): Promise<Agent | null> {
  const { collections } = getConfig();

  const [item, areaItems, specialtyItems] = await Promise.all([
    client.getItem<AgentFields>(collections.agents, agentId),
    client.listAllItems<TaxonomyFields>(collections.areas),
    client.listAllItems<TaxonomyFields>(collections.specialties),
  ]);

  if (!item || item.isArchived) return null;
  return mapAgents([item], areaItems, specialtyItems)[0] ?? null;
}

/** Update agent CMS fields and publish live. Requires cms:write token scope. */
export async function updateAgentProfile(
  agentId: string,
  fieldData: Partial<AgentFields>,
  client: WebflowClient = new WebflowClient(),
): Promise<Agent> {
  const { collections } = getConfig();

  await client.updateItem(collections.agents, agentId, fieldData);
  await client.publishItems(collections.agents, [agentId]);

  const updated = await fetchAgentById(agentId, client);
  if (!updated) {
    throw new Error(`Agent ${agentId} not found after update.`);
  }
  return updated;
}

export interface TaxonomyOption {
  id: string;
  name: string;
  slug: string;
}

export async function fetchTaxonomyOptions(
  client: WebflowClient = new WebflowClient(),
): Promise<{ areas: TaxonomyOption[]; specialties: TaxonomyOption[] }> {
  const { collections } = getConfig();
  const [areaItems, specialtyItems] = await Promise.all([
    client.listAllItems<TaxonomyFields>(collections.areas),
    client.listAllItems<TaxonomyFields>(collections.specialties),
  ]);

  const toOption = (item: RawCmsItem<TaxonomyFields>): TaxonomyOption => ({
    id: item.id,
    name: item.fieldData.name,
    slug: item.fieldData.slug,
  });

  return {
    areas: areaItems.map(toOption).sort((a, b) => a.name.localeCompare(b.name)),
    specialties: specialtyItems.map(toOption).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
