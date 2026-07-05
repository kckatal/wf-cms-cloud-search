/**
 * GET /api/search
 *
 * Query params:
 *   q          free-text query (empty = browse all agents)
 *   area       filter by area slug
 *   specialty  filter by specialty slug
 *   minRating  minimum rating (number)
 *   limit      page size (default 20, max 100)
 *   offset     pagination offset (default 0)
 *
 * Returns the {@link SearchResponse} JSON.
 */

import type { APIRoute } from "astro";

import { searchAgents, SORT_KEYS, type SearchParams, type SortKey } from "../../lib/search";

// Run on-demand (the search index is queried per request, not prerendered).
export const prerender = false;
export const config = {
  runtime: "edge",
};

function parseNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseSort(value: string | null): SortKey | undefined {
  return value != null && (SORT_KEYS as string[]).includes(value)
    ? (value as SortKey)
    : undefined;
}

export const GET: APIRoute = async ({ url }) => {
  const { searchParams } = url;
  const realtorParam = searchParams.get("realtor");

  const params: SearchParams = {
    q: searchParams.get("q") ?? undefined,
    area: searchParams.get("area") ?? undefined,
    specialty: searchParams.get("specialty") ?? undefined,
    minRating: parseNumber(searchParams.get("minRating")),
    realtor: realtorParam === "true" || realtorParam === "1",
    sort: parseSort(searchParams.get("sort")),
    limit: parseNumber(searchParams.get("limit")),
    offset: parseNumber(searchParams.get("offset")),
  };

  try {
    const response = await searchAgents(params);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Short edge cache; index data changes only when rebuilt.
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: "search_failed", message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};
