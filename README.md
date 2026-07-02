# Webflow CMS Search & Filter

An [Astro](https://astro.build) app that turns a Webflow CMS collection into a fast, filterable search surface. It pulls live CMS data, resolves multi-reference fields server-side, and serves faceted search with shareable URLs—without relying on Webflow's limited server-side filtering.

The default configuration targets **Woodland Properties**, a real estate agent directory backed by three Webflow collections (Agents, Areas, and Specialties). The same pattern can be adapted to other CMS schemas by updating collection IDs and field mappings.

## What it does

- **Syncs from Webflow CMS** — Fetches agents and related taxonomy collections via the Webflow Data API v2, then denormalizes multi-reference fields (e.g. Areas Served, Specialties) into searchable strings.
- **Server-side search index** — Builds a [MiniSearch](https://lucas.github.io/minisearch/) index in memory for fuzzy name/text matching, faceted filtering, sorting, and pagination.
- **Dynamic filter UI** — A search page with area, specialty, rating, REALTOR® badge, and free-text filters. Filter state lives in the URL so results are bookmarkable and work on direct page loads.
- **Webflow DevLink styling** — Navbar and footer come from a DevLink export so the search page matches the parent Webflow site.

## Architecture

```
Webflow CMS (Agents, Areas, Specialties)
        │
        ▼
  Webflow Data API v2
        │
        ▼
  Denormalize + index (MiniSearch)
        │
        ├── GET /api/search  → JSON results + facets
        └── /                → SSR search page (with client-side navigation)
```

**Index lifecycle**

1. On each request, the app loads (or refreshes) a search index from Webflow.
2. Results are cached in-process for a configurable TTL (`SEARCH_INDEX_TTL_SECONDS`, default 5 minutes). Stale data is served immediately while a background refresh runs.
3. Optionally, run `npm run build:index` to write a static fallback bundle to `src/data/agents-index.json`. If the live API is unavailable, the app falls back to this file.

This design avoids per-filter round trips to Webflow and scales to thousands of CMS items with a compact in-memory index.

## Filters & sorting

| Dimension | Type |
| --- | --- |
| Agent name | Fuzzy text search |
| Area | Single-select (from Areas collection) |
| Specialty | Single-select (from Specialties collection) |
| Rating | Minimum threshold (3+, 4+, 5) |
| REALTOR® badge | Toggle |
| Sort | Relevance, rating, sales, experience |

## Requirements

- Node.js ≥ 22.12
- A Webflow site API token with CMS read access

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure environment**

   ```sh
   cp .env.example .env
   ```

   Set `WEBFLOW_API_TOKEN` in `.env`. Optional overrides for site and collection IDs are documented in `.env.example`.

3. **Start the dev server**

   ```sh
   npm run dev
   ```

   Open [http://localhost:4321](http://localhost:4321).

4. **(Optional) Prebuild a static index**

   Useful for faster cold starts or as a fallback when the API is down:

   ```sh
   npm run build:index
   ```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Production build (Node standalone adapter) |
| `npm run preview` | Preview the production build locally |
| `npm run build:index` | Fetch CMS data and write `src/data/agents-index.json` |

## Project structure

```text
scripts/
  build-index.ts          # Offline index builder
src/
  components/             # Site chrome (nav, footer wrappers)
  lib/
    search/               # Index lifecycle, query API, URL params
    webflow/              # Data API client, agent fetch + denormalization
    ui/                   # Result card and pagination rendering
  pages/
    index.astro           # Search page (SSR + client navigation)
    api/search.ts         # JSON search endpoint
webflow/                  # DevLink export (components + CSS)
```

## API

`GET /api/search` accepts query parameters:

| Param | Description |
| --- | --- |
| `q` | Free-text search (omit to browse all) |
| `area` | Area slug filter |
| `specialty` | Specialty slug filter |
| `minRating` | Minimum rating (number) |
| `realtor` | `1` or `true` for REALTOR® badge only |
| `sort` | `relevance`, `rating`, `sales`, or `experience` |
| `limit` | Page size (default 20, max 100) |
| `offset` | Pagination offset |

Returns JSON with `results`, `total`, `facets` (areas and specialties with counts), and index metadata.

## Adapting to another site

1. Update collection IDs in `.env` (or change defaults in `src/lib/webflow/config.ts`).
2. Adjust field mappings in `src/lib/webflow/types.ts`, `agents.ts`, and `document.ts` to match your CMS schema.
3. Customize the search UI in `src/pages/index.astro` and result cards in `src/lib/ui/card.ts`.

## CMS schema (default)

The Woodland Properties site uses:

- **Agents** — profile fields, ratings, sales stats, price range, and multi-references to Areas and Specialties
- **Areas** — name and slug
- **Specialties** — name and slug

Webflow returns multi-reference fields as item ID arrays; this app resolves them to names and slugs at index time because the Webflow API does not support filtering on multi-reference fields server-side.

## License

Private / internal use unless otherwise specified.
