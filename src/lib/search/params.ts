/**
 * Translates URL query params into {@link SearchParams} for {@link searchAgents}.
 * Shared by the SSR page and the /api/search route so the query-param contract
 * lives in one place. Browser-safe (only type-imports the heavy search module).
 */

import { parseFilterState, parsePage } from "../ui/pagination";
import type { SearchParams } from "./index";

/** Results per page, shared by the SSR render, the client, and offset math. */
export const PAGE_SIZE = 12;

export type SortKey = "relevance" | "rating" | "sales" | "experience";

export const SORT_KEYS: SortKey[] = ["relevance", "rating", "sales", "experience"];

function toSort(value: string): SortKey {
  return (SORT_KEYS as string[]).includes(value) ? (value as SortKey) : "relevance";
}

/**
 * Parse a URL's query params into a {@link SearchParams} (with `limit`/`offset`
 * derived from `page` and {@link PAGE_SIZE}) plus the resolved 1-indexed page.
 */
export function parseSearchQuery(sp: URLSearchParams): { params: SearchParams; page: number } {
  const state = parseFilterState(sp);
  const page = parsePage(sp);
  return {
    page,
    params: {
      q: state.q || undefined,
      area: state.area || undefined,
      specialty: state.specialty || undefined,
      minRating: state.minRating ? Number(state.minRating) : undefined,
      realtor: state.realtor === "1",
      sort: toSort(state.sort),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
  };
}
