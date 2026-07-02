/**
 * Maps a denormalized {@link Agent} into a flat {@link AgentDocument} suitable
 * for full-text indexing, filtering, and rendering search results.
 */

import type { Agent } from "../webflow/types";

export interface AgentDocument {
  id: string;
  slug: string;
  name: string;
  brokerageName: string;
  companyName: string;
  cityStateZip: string;
  /** Plain-text bio used for full-text matching and snippets. */
  bio: string;
  /** Specialty names joined for indexing. */
  specialtyNames: string;
  /** Area names joined for indexing. */
  areaNames: string;

  // --- Stored for filtering ---
  specialtySlugs: string[];
  areaSlugs: string[];

  // --- Stored for rendering results (no rehydration from Webflow needed) ---
  specialties: string[];
  areas: string[];
  headshotUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  yearsOfExperience: number | null;
  recentSalesCount: number | null;
  priceRangeLow: string | null;
  priceRangeHigh: string | null;
  phone: string | null;
  realtorBadge: boolean;
  totalListings: number | null;
}

/** Fields MiniSearch tokenizes for full-text search. */
export const SEARCH_FIELDS: (keyof AgentDocument)[] = [
  "name",
  "brokerageName",
  "companyName",
  "cityStateZip",
  "bio",
  "specialtyNames",
  "areaNames",
];

/** Fields stored on each result so the API can return them without a refetch. */
export const STORE_FIELDS: (keyof AgentDocument)[] = [
  "id",
  "slug",
  "name",
  "headshotUrl",
  "brokerageName",
  "companyName",
  "cityStateZip",
  "rating",
  "reviewCount",
  "yearsOfExperience",
  "recentSalesCount",
  "priceRangeLow",
  "priceRangeHigh",
  "phone",
  "realtorBadge",
  "totalListings",
  "specialties",
  "areas",
  "specialtySlugs",
  "areaSlugs",
];

export function toDocument(agent: Agent): AgentDocument {
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    brokerageName: agent.brokerageName ?? "",
    companyName: agent.companyName ?? "",
    cityStateZip: agent.cityStateZip ?? "",
    bio: agent.bioText ?? "",
    specialtyNames: agent.specialties.map((s) => s.name).join(", "),
    areaNames: agent.areasServed.map((a) => a.name).join(", "),
    specialtySlugs: agent.specialties.map((s) => s.slug),
    areaSlugs: agent.areasServed.map((a) => a.slug),
    specialties: agent.specialties.map((s) => s.name),
    areas: agent.areasServed.map((a) => a.name),
    headshotUrl: agent.headshotUrl,
    rating: agent.rating,
    reviewCount: agent.reviewCount,
    yearsOfExperience: agent.yearsOfExperience,
    recentSalesCount: agent.recentSalesCount,
    priceRangeLow: agent.priceRangeLow,
    priceRangeHigh: agent.priceRangeHigh,
    phone: agent.phone,
    realtorBadge: agent.realtorBadge,
    totalListings: agent.totalListings,
  };
}
