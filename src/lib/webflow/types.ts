/**
 * Types for the Webflow Data API v2 CMS responses and the denormalized domain
 * models used by the search layer.
 */

/** A Webflow Image field value. */
export interface WebflowImage {
  fileId: string;
  url: string;
  alt: string | null;
}

/** Raw CMS item as returned by `GET /collections/{id}/items`. */
export interface RawCmsItem<TFields = Record<string, unknown>> {
  id: string;
  cmsLocaleId: string;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: TFields;
}

export interface CmsListResponse<TFields = Record<string, unknown>> {
  items: RawCmsItem<TFields>[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

/** Field data for items in the Areas and Specialties collections. */
export interface TaxonomyFields {
  name: string;
  slug: string;
}

/** Field data for items in the Agents collection. */
export interface AgentFields {
  name: string;
  slug: string;
  headshot?: WebflowImage | null;
  "brokerage-name"?: string | null;
  "years-of-experience"?: number | null;
  rating?: number | null;
  "review-count"?: number | null;
  "recent-sales-count"?: number | null;
  "price-range-low"?: string | null;
  "price-range-high"?: string | null;
  bio?: string | null;
  "license-number"?: string | null;
  phone?: string | null;
  "phone-label"?: string | null;
  "street-address"?: string | null;
  "city-state-zip"?: string | null;
  "website-name"?: string | null;
  "website-url"?: string | null;
  "company-name"?: string | null;
  "company-url"?: string | null;
  "first-name"?: string | null;
  "last-name"?: string | null;
  email?: string | null;
  "realtor-badge"?: boolean | null;
  "total-listings"?: number | null;
  "active-listings-count"?: number | null;
  "rent-listings-count"?: number | null;
  "worked-with-seller-count"?: number | null;
  /** MultiReference → Specialties collection item IDs. */
  specialties?: string[] | null;
  /** MultiReference → Areas collection item IDs. */
  "areas-served"?: string[] | null;
}

/** A resolved reference to a taxonomy item (area or specialty). */
export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
}

/** Denormalized agent with references resolved to names + slugs. */
export interface Agent {
  id: string;
  slug: string;
  name: string;
  headshotUrl: string | null;
  headshotAlt: string | null;
  brokerageName: string | null;
  companyName: string | null;
  yearsOfExperience: number | null;
  rating: number | null;
  reviewCount: number | null;
  recentSalesCount: number | null;
  priceRangeLow: string | null;
  priceRangeHigh: string | null;
  /** Raw RichText HTML from the CMS. */
  bioHtml: string | null;
  /** Plain-text version of the bio, used for indexing and snippets. */
  bioText: string | null;
  licenseNumber: string | null;
  phone: string | null;
  phoneLabel: string | null;
  streetAddress: string | null;
  cityStateZip: string | null;
  websiteName: string | null;
  websiteUrl: string | null;
  companyUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  realtorBadge: boolean;
  totalListings: number | null;
  activeListingsCount: number | null;
  rentListingsCount: number | null;
  workedWithSellerCount: number | null;
  specialties: TaxonomyRef[];
  areasServed: TaxonomyRef[];
}
