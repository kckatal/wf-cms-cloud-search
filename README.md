# Webflow CMS Search & Filter

An [Astro](https://astro.build) app deployed on [Webflow Cloud](https://developers.webflow.com/webflow-cloud) (Cloudflare Workers) that combines two surfaces for a real estate agent directory:

1. **Public agent search** — Fast, faceted search over a Webflow CMS collection with shareable URLs.
2. **Agent portal** — Auth0 sign-in so agents can edit their own CMS profile; admins can review an audit log of changes.

The default configuration targets **Anderson Group** (staging site `anderson-group-stage.webflow.io`), backed by three Webflow collections (Agents, Areas, and Specialties). The same pattern can be adapted to other CMS schemas by updating collection IDs and field mappings.

## What it does



### Agent search (public)

- **Syncs from Webflow CMS** — Fetches agents and taxonomy collections via the Webflow Data API, then denormalizes multi-reference fields (Areas Served, Specialties) into searchable strings.
- **In-memory search index** — Builds a [MiniSearch](https://lucas.github.io/minisearch/) index for fuzzy name/text matching, faceted filtering, sorting, and pagination.
- **Dynamic filter UI** — Search page with area, specialty, rating, REALTOR® badge, and free-text filters. Filter state lives in the URL so results are bookmarkable.
- **Webflow DevLink styling** — Navbar and footer come from a DevLink export so the app matches the parent Webflow site.



### Agent portal (authenticated)

- **Auth0 login** — OAuth via Universal Login; session stored in an httpOnly cookie (`auth_token`).
- **Agent ↔ CMS linking** — Auth0 `app_metadata` carries `webflow_agent_id` and `roles`; a Post Login Action adds custom JWT claims (`roles`, `agent_id`).
- **Profile editor** (`/profile`) — Agents edit phone, address, bio, brokerage, license, website/company links, areas served, specialties, and profile photo. Saves update the live CMS item, publish it, invalidate the search index, and append an audit entry.
- **Admin change log** (`/admin/changelog`) — Staff with the `admin` role see a paginated list of profile edits (field-level before/after), stored in Cloudflare KV.



## Architecture

```
Webflow CMS (Agents, Areas, Specialties)
        │
        ▼
  Webflow Data API v2
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
  Denormalize + MiniSearch index          CMS write + assets
        │                                      │
        ├── GET /api/search                    ├── PATCH /api/agent/profile
        └── /  (search page)                   └── POST …/headshot (legacy)
        │
        ▼
  Auth0 (login) ──► /profile, /admin/changelog
        │
        ▼
  Cloudflare KV (profile change log)
```

**Search index lifecycle**

1. On each request, the app loads (or refreshes) a search index from Webflow.
2. Results are cached in-process for a configurable TTL (`SEARCH_INDEX_TTL_SECONDS`, default 5 minutes). Stale data is served immediately while a background refresh runs.
3. Profile saves call `invalidateIndex()` so the next search request rebuilds from CMS.
4. Optionally, run `npm run build:index` to write a static fallback bundle to `src/data/agents-index.json`. On Cloudflare Workers there is no filesystem; the live API path is always used in production.

This design avoids per-filter round trips to Webflow and scales to thousands of CMS items with a compact in-memory index.

## Routes

All routes are prefixed by the Webflow Cloud mount path (`CLOUD_MOUNT_PATH` locally, e.g. `/find-an-agent` in production).


| Route              | Access | Description                                         |
| ------------------ | ------ | --------------------------------------------------- |
| `/`                | Public | Agent search page                                   |
| `/login`           | Public | Portal hub — sign in, links to profile / change log |
| `/profile`         | Agent  | Edit and publish own CMS profile                    |
| `/admin/changelog` | Admin  | Review profile edit audit log                       |
| `/auth/login`      | Public | Redirect to Auth0                                   |
| `/auth/callback`   | Public | OAuth callback; sets session cookie                 |
| `/auth/logout`     | Public | Clears session; redirects to login                  |




## Filters & sorting


| Dimension      | Type                                        |
| -------------- | ------------------------------------------- |
| Agent name     | Fuzzy text search                           |
| Area           | Single-select (from Areas collection)       |
| Specialty      | Single-select (from Specialties collection) |
| Rating         | Minimum threshold (3+, 4+, 5)               |
| REALTOR® badge | Toggle                                      |
| Sort           | Relevance, rating, sales, experience        |




## Requirements

- Node.js ≥ 22.12
- A Webflow site API token with `cms:read`, `cms:write`, and `assets:write` (photos)
- An Auth0 Regular Web Application (for the agent portal)
- Cloudflare KV namespace bound as `CHANGELOG_KV` (production / `wrangler preview`)



## Setup

1. **Install dependencies**
  ```sh
   npm install
  ```
2. **Configure environment**
  ```sh
   cp .env.example .env
  ```
   Set at minimum:
  - `WEBFLOW_API_TOKEN` — see scopes above; run `npm run webflow:check-token` to verify `assets:write`.
  - Auth0 vars — `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_CALLBACK_URL` (see `.env.example` for callback URL patterns).
   Optional: `PUBLIC_SITE_URL` (agent profile preview links on the main site), collection ID overrides, `SEARCH_INDEX_TTL_SECONDS`.
3. **Start the dev server**
  ```sh
   npm run dev
  ```
   Open [http://localhost:4321/CLOUD_MOUNT_PATH](http://localhost:4321/CLOUD_MOUNT_PATH) (Astro `base` is the mount-path placeholder until Webflow Cloud replaces it at deploy time).
4. **(Optional) Prebuild a static search index**
  ```sh
   npm run build:index
  ```
5. **(Optional) Generate Auth0 bulk-import file**
  Creates `auth0-import.json` (gitignored) from CMS agent emails:
   Upload in Auth0 Dashboard → User Management → Import Users. Each row includes `app_metadata.roles: ["agent"]` and `webflow_agent_id`. Configure a Post Login Action to copy those into JWT claims under `AUTH0_CLAIMS_NAMESPACE`.



## Commands


| Command                       | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `npm run dev`                 | Astro dev server (in-memory KV fallback for changelog)        |
| `npm run build`               | Production build for Cloudflare Workers                       |
| `npm run preview`             | Build + `wrangler dev` (uses KV binding from `wrangler.json`) |
| `npm run build:index`         | Fetch CMS data and write `src/data/agents-index.json`         |
| `npm run auth0:import`        | Generate `auth0-import.json` for Auth0 bulk user import       |
| `npm run webflow:check-token` | Verify API token has `assets:write`                           |




## Project structure

```text
scripts/
  build-index.ts              # Offline search index builder
  generate-auth0-import.ts    # Auth0 bulk import from CMS emails
  check-webflow-token.ts      # Token scope checker
  patch-cloudflare-for-webflow.mjs
src/
  components/                 # Site chrome (nav, footer wrappers)
  lib/
    auth/                     # Auth0 config, session, route guards
    changelog/                # Profile edit diff + KV storage
    profile/                  # Editable fields, headshot validation, save pipeline
    search/                   # Index lifecycle, query API, URL params
    webflow/                  # Data API client, agents, assets upload
    ui/                       # Result card and pagination rendering
  pages/
    index.astro               # Search page
    login.astro               # Portal login hub
    profile.astro             # Agent profile editor
    admin/changelog.astro     # Admin audit log
    auth/                     # OAuth login, callback, logout
    api/
      search.ts               # JSON search endpoint
      me.ts                   # Current session (JWT claims)
      agent/profile.ts        # GET/PATCH profile (JSON or multipart)
      agent/profile/headshot.ts  # Legacy headshot-only POST
      admin/changelog.ts      # JSON changelog API
webflow/                      # DevLink export (components + CSS)
```



## API



### `GET /api/search`


| Param       | Description                                     |
| ----------- | ----------------------------------------------- |
| `q`         | Free-text search (omit to browse all)           |
| `area`      | Area slug filter                                |
| `specialty` | Specialty slug filter                           |
| `minRating` | Minimum rating (number)                         |
| `realtor`   | `1` or `true` for REALTOR® badge only           |
| `sort`      | `relevance`, `rating`, `sales`, or `experience` |
| `limit`     | Page size (default 20, max 100)                 |
| `offset`    | Pagination offset                               |


Returns JSON with `results`, `total`, `facets` (areas and specialties with counts), and index metadata.

### `GET /api/me`

Returns the authenticated user's `sub`, `email`, `name`, `roles`, and `agentId` from the session JWT. Requires the auth cookie.

### `GET /api/agent/profile` · `PATCH /api/agent/profile`

Agent-only (linked `webflow_agent_id`). GET returns editable profile fields and taxonomy options. PATCH accepts JSON or `multipart/form-data` (fields + optional `headshot` file). Updates publish the CMS item and record changes in the changelog.

### `GET /api/admin/changelog`

Admin-only. Returns paginated profile change entries from KV.

## CMS schema (default)

Site ID: `6a3ee562ea51d6c9ddc156c7`


| Collection  | ID                         | Notes                      |
| ----------- | -------------------------- | -------------------------- |
| Agents      | `6a3eeb88509425ae62309159` | Profile, stats, multi-refs |
| Areas       | `6a3ee7398f36f58b907d2df1` | Name, slug                 |
| Specialties | `6a3ee77638f548e2e9600bb7` | Name, slug                 |


**Agents** — name, slug, headshot, first/last name, email, phone, address, bio, brokerage, license, website/company links, ratings and sales stats, price range, REALTOR® badge, listing counts, and multi-references to Areas and Specialties.

**Portal-editable fields** — phone, address, bio, brokerage, license, website/company URLs, areas served, specialties, profile photo. Name, email, and read-only stats are managed in CMS (or via Auth0 import), not in the profile form.

Webflow returns multi-reference fields as item ID arrays; this app resolves them to names and slugs at index time because the Webflow API does not support filtering on multi-reference fields server-side.

## Auth0 integration

1. Create a Regular Web Application; register callback and logout URLs under your Cloud mount path.
2. Bulk-import agents with `npm run auth0:import` (uses CMS `email` field).
3. Add a Post Login Action that reads `app_metadata.roles` and `app_metadata.webflow_agent_id` and sets custom claims:
  - `{namespace}/roles`
  - `{namespace}/agent_id`
4. Set `AUTH0_CLAIMS_NAMESPACE` to match the Action (default: `https://anderson-group-stage.webflow.io`).
5. Create at least one admin user manually with `app_metadata.roles: ["admin"]`.

Demo agents share a default password configured via `AUTH0_DEFAULT_PASSWORD` in `.env.example`.

## Deploying on Webflow Cloud

- `astro.config.mjs` uses `@astrojs/cloudflare` with `base: "CLOUD_MOUNT_PATH"` (replaced at build time).
- Runtime secrets are injected via Cloudflare bindings; middleware exposes them through `cloudflare:workers`.
- Create a KV namespace for the changelog and set its id in `wrangler.json` under `CHANGELOG_KV` before production deploy.
- After rotating `WEBFLOW_API_TOKEN`, update Webflow Cloud environment variables and restart the deployment.



## Adapting to another site

1. Update collection IDs in `.env` (or defaults in `src/lib/webflow/config.ts`).
2. Adjust field mappings in `src/lib/webflow/types.ts`, `agents.ts`, `document.ts`, and `lib/profile/fields.ts`.
3. Customize the search UI in `src/pages/index.astro` and result cards in `src/lib/ui/card.ts`.
4. Re-export DevLink components from your Webflow site into `webflow/`.



## License

Private / internal use unless otherwise specified.