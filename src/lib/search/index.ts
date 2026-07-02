/**
 * Search index lifecycle and query API.
 *
 * Strategy: build-time static index with a runtime fallback. {@link getIndex}
 * loads the prebuilt bundle from disk; if it's missing (e.g. first run before
 * `npm run build:index`) it fetches live from Webflow and builds in memory.
 * Either way the result is memoized for the lifetime of the process.
 */

import MiniSearch from "minisearch";

import { fetchAgents } from "../webflow/agents";
import { readEnv } from "../webflow/config";
import {
  SEARCH_FIELDS,
  STORE_FIELDS,
  toDocument,
  type AgentDocument,
} from "./document";
import { readIndexBundle, type IndexBundle } from "./storage";

const MINISEARCH_OPTIONS = {
  idField: "id",
  fields: SEARCH_FIELDS as string[],
  storeFields: STORE_FIELDS as string[],
};

const SEARCH_OPTIONS = {
  prefix: true,
  fuzzy: 0.2,
  combineWith: "AND" as const,
  boost: { name: 3, specialtyNames: 2, areaNames: 2 },
};

/** A loaded, queryable index plus its backing documents and metadata. */
export interface LoadedIndex {
  miniSearch: MiniSearch<AgentDocument>;
  documents: AgentDocument[];
  generatedAt: string;
  /** "live" if fetched at runtime, "static" if served from the fallback bundle. */
  source: "static" | "live";
}

/**
 * How long a loaded index is considered fresh, in ms. After this it's refreshed
 * from Webflow on the next request. Override with SEARCH_INDEX_TTL_SECONDS
 * (0 = fetch live on every request, no caching). Default: 5 minutes.
 */
const TTL_MS = (() => {
  const raw = readEnv("SEARCH_INDEX_TTL_SECONDS");
  const seconds = raw != null && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isFinite(seconds) ? Math.max(0, seconds) * 1000 : 5 * 60 * 1000;
})();

interface CacheEntry {
  value: LoadedIndex;
  expiresAt: number;
}

let entry: CacheEntry | null = null;
let inflight: Promise<LoadedIndex> | null = null;

/** Build a fresh MiniSearch index from documents. */
export function buildIndex(documents: AgentDocument[]): MiniSearch<AgentDocument> {
  const ms = new MiniSearch<AgentDocument>(MINISEARCH_OPTIONS);
  ms.addAll(documents);
  return ms;
}

/** Serialize documents + index into a bundle for the static file. */
export function buildBundle(documents: AgentDocument[]): IndexBundle {
  const ms = buildIndex(documents);
  return {
    generatedAt: new Date().toISOString(),
    count: documents.length,
    miniSearch: JSON.stringify(ms),
    documents,
  };
}

/**
 * Get the search index. Live Webflow data is the source of truth, cached for
 * {@link TTL_MS}. When the cache is stale it's served immediately while a
 * refresh runs in the background (stale-while-revalidate), so requests never
 * block on Webflow once warmed. With TTL=0, every call fetches fresh.
 */
export async function getIndex(): Promise<LoadedIndex> {
  const now = Date.now();

  if (entry && TTL_MS > 0 && now < entry.expiresAt) {
    return entry.value; // fresh
  }

  if (entry && TTL_MS > 0) {
    // Stale: serve current data now, refresh in the background.
    if (!inflight) inflight = startRefresh();
    return entry.value;
  }

  // Cold start, or TTL=0 (always fetch fresh): must await the load.
  if (!inflight) inflight = startRefresh();
  return inflight;
}

/** Force a reload on the next {@link getIndex} call (e.g. from a CMS webhook). */
export function invalidateIndex(): void {
  entry = null;
}

function startRefresh(): Promise<LoadedIndex> {
  const run = loadFresh()
    .then((value) => {
      entry = { value, expiresAt: Date.now() + TTL_MS };
      return value;
    })
    .catch((err) => {
      // Keep serving the last good data if a background refresh fails.
      if (entry) {
        console.error("Search index refresh failed; serving cached data:", err);
        return entry.value;
      }
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return run;
}

/**
 * Load fresh data from Webflow. If the live API fails, fall back to the prebuilt
 * static bundle (if one was generated via `npm run build:index`).
 */
async function loadFresh(): Promise<LoadedIndex> {
  try {
    const documents = (await fetchAgents()).map(toDocument);
    return {
      miniSearch: buildIndex(documents),
      documents,
      generatedAt: new Date().toISOString(),
      source: "live",
    };
  } catch (err) {
    const bundle = await readIndexBundle();
    if (bundle) {
      console.error("Live Webflow fetch failed; using prebuilt static index:", err);
      return {
        miniSearch: MiniSearch.loadJSON<AgentDocument>(bundle.miniSearch, MINISEARCH_OPTIONS),
        documents: bundle.documents,
        generatedAt: bundle.generatedAt,
        source: "static",
      };
    }
    throw err;
  }
}

// --- Query API ---------------------------------------------------------------

// SortKey / SORT_KEYS live in ./params (browser-safe) so the client and the
// URL parser can share them; re-exported here to keep the public surface stable.
import { SORT_KEYS, type SortKey } from "./params";
export { SORT_KEYS, type SortKey };

export interface SearchParams {
  /** Free-text query. Empty/omitted returns all agents (browse mode). */
  q?: string;
  /** Filter to agents serving this area (by slug). */
  area?: string;
  /** Filter to agents with this specialty (by slug). */
  specialty?: string;
  /** Minimum rating (inclusive). */
  minRating?: number;
  /** Restrict to agents with the REALTOR® badge. */
  realtor?: boolean;
  /** Result ordering. Defaults to "relevance". */
  sort?: SortKey;
  limit?: number;
  offset?: number;
}

export interface SearchResultItem extends AgentDocument {
  /** Relevance score; null in browse mode (no query). */
  score: number | null;
}

export interface Facet {
  slug: string;
  name: string;
  count: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  limit: number;
  offset: number;
  sort: SortKey;
  source: "static" | "live";
  generatedAt: string;
  results: SearchResultItem[];
  facets: {
    areas: Facet[];
    specialties: Facet[];
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function searchAgents(params: SearchParams = {}): Promise<SearchResponse> {
  const { miniSearch, documents, source, generatedAt } = await getIndex();
  const byId = new Map(documents.map((doc) => [doc.id, doc]));

  const query = (params.q ?? "").trim();
  const limit = clamp(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = Math.max(0, params.offset ?? 0);

  // 1. Base set: full-text matches (scored) or all documents (browse).
  let matched: SearchResultItem[];
  if (query.length > 0) {
    matched = miniSearch
      .search(query, SEARCH_OPTIONS)
      .map((hit): SearchResultItem | null => {
        const doc = byId.get(hit.id as string);
        return doc ? { ...doc, score: hit.score } : null;
      })
      .filter((item): item is SearchResultItem => item !== null);
  } else {
    matched = documents
      .map((doc) => ({ ...doc, score: null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // 2. Apply minRating filter (independent of facets).
  if (params.minRating != null) {
    const min = params.minRating;
    matched = matched.filter((item) => (item.rating ?? 0) >= min);
  }

  // 3. Facets computed over the query-matched set, before the area/specialty
  //    filters so the facet list stays stable as the user drills in.
  const facets = {
    areas: countFacets(matched, "areaSlugs", "areas"),
    specialties: countFacets(matched, "specialtySlugs", "specialties"),
  };

  // 4. Apply taxonomy + realtor filters.
  let filtered = matched;
  if (params.area) {
    filtered = filtered.filter((item) => item.areaSlugs.includes(params.area!));
  }
  if (params.specialty) {
    filtered = filtered.filter((item) => item.specialtySlugs.includes(params.specialty!));
  }
  if (params.realtor) {
    filtered = filtered.filter((item) => item.realtorBadge);
  }

  // 5. Sort (relevance keeps the base order: score for queries, name for browse).
  filtered = sortResults(filtered, params.sort ?? "relevance");

  // 6. Paginate.
  const total = filtered.length;
  const results = filtered.slice(offset, offset + limit);

  return {
    query,
    total,
    limit,
    offset,
    sort: params.sort ?? "relevance",
    source,
    generatedAt,
    results,
    facets,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Sort a copy of the results by the given key. "relevance" is a no-op. */
function sortResults(items: SearchResultItem[], sort: SortKey): SearchResultItem[] {
  if (sort === "relevance") return items;
  const byNumberDesc = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1);
  const sorted = [...items];
  switch (sort) {
    case "rating":
      sorted.sort(
        (a, b) => byNumberDesc(a.rating, b.rating) || byNumberDesc(a.reviewCount, b.reviewCount),
      );
      break;
    case "sales":
      sorted.sort((a, b) => byNumberDesc(a.recentSalesCount, b.recentSalesCount));
      break;
    case "experience":
      sorted.sort((a, b) => byNumberDesc(a.yearsOfExperience, b.yearsOfExperience));
      break;
  }
  return sorted;
}

/** Count occurrences of each slug across results, pairing with display names. */
function countFacets(
  items: SearchResultItem[],
  slugField: "areaSlugs" | "specialtySlugs",
  nameField: "areas" | "specialties",
): Facet[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const item of items) {
    const slugs = item[slugField];
    const names = item[nameField];
    slugs.forEach((slug, i) => {
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { name: names[i] ?? slug, count: 1 });
    });
  }
  return [...counts.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
