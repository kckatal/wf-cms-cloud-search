# Webflow CMS Search & Filter

An [Astro](https://astro.build) app on [Webflow Cloud](https://developers.webflow.com/webflow-cloud) (Cloudflare Workers) for an agent directory. It ships two surfaces:

1. **Public agent search** — Faceted search over Webflow CMS with shareable URLs.
2. **Agent portal** — Auth0 sign-in so agents can edit their CMS profile; admins review a change log.

Configured for **Anderson Group** (`anderson-group-stage.webflow.io`) with Agents, Areas, and Specialties collections.

## What it does

**Search**

- Reads published CMS data via Webflow’s **Content Delivery API** (`api-cdn.webflow.com`), then denormalizes multi-reference fields (areas, specialties) into a searchable index.
- Builds an in-memory [MiniSearch](https://lucas.github.io/minisearch/) index (TTL-cached) for fuzzy text search, filters, sorting, and pagination—no per-filter round trips to Webflow.
- UI filters: name, area, specialty, rating, sort. Filter state lives in the URL.
- Navbar/footer from a Webflow DevLink export.

**Portal**

- Auth0 Universal Login (httpOnly session cookie).
- Agents linked via Auth0 `app_metadata` (`webflow_agent_id`, `roles`) → JWT claims.
- `/profile` — edit contact info, bio, areas, specialties, photo; publishes to CMS, refreshes the search index, and logs the change.
- `/admin/changelog` — field-level audit trail in Cloudflare KV.

Profile updates and asset uploads use the Webflow **Data API** (`api.webflow.com`) with `cms:write` / `assets:write`.

## Quick start

```sh
npm install
cp .env.example .env   # WEBFLOW_API_TOKEN + Auth0 vars
npm run dev            # http://localhost:4321/CLOUD_MOUNT_PATH
```

Required: Node ≥ 22.12, Webflow token (`cms:read`, `cms:write`, `assets:write`), Auth0 app, and a `CHANGELOG_KV` binding for production.

| Command | Description |
| --- | --- |
| `npm run dev` | Local Astro dev |
| `npm run build` / `npm run preview` | Cloudflare build / Wrangler preview |
| `npm run build:index` | Optional static search index fallback |
| `npm run auth0:import` | Generate Auth0 bulk-import JSON from CMS |
| `npm run webflow:check-token` | Verify `assets:write` on the token |

## Routes

Prefixed by the Cloud mount path (`CLOUD_MOUNT_PATH` locally, e.g. `/find-an-agent` in production).

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Agent search |
| `/login` | Public | Portal hub |
| `/profile` | Agent | Edit CMS profile |
| `/admin/changelog` | Admin | Change log |
| `/auth/*` | Public | Auth0 login / callback / logout |
| `/api/search` | Public | JSON search + facets |
| `/api/agent/profile` | Agent | GET/PATCH profile |
| `/api/me` | Auth | Current session |

## Auth0 (portal)

1. Register callback/logout URLs under your Cloud mount path.
2. `npm run auth0:import` → upload users (includes `roles` + `webflow_agent_id`).
3. Post Login Action copies those into JWT claims under `AUTH0_CLAIMS_NAMESPACE`.
4. Create an admin user with `app_metadata.roles: ["admin"]`.

## Deploy notes

- `@astrojs/cloudflare` with `base: "CLOUD_MOUNT_PATH"` (replaced at Webflow Cloud build time).
- Set env vars in Webflow Cloud; bind a real KV namespace id for `CHANGELOG_KV` in `wrangler.json`.
- Profile saves send JSON (not multipart) so Astro CSRF checks don’t 403 behind Webflow’s proxy.

## CMS schema (Anderson Group)

This app is wired to three collections. System fields (`name`, `slug`) are standard; everything else below is a **custom CMS field** whose slug is hardcoded in TypeScript.

### Site & collection IDs

Defaults live in `src/lib/webflow/config.ts`. Override via env (see `.env.example`) when pointing at another site:

| Env var | Default (Anderson Group) | What it is |
| --- | --- | --- |
| `WEBFLOW_SITE_ID` | `6a3ee562ea51d6c9ddc156c7` | Site ID (asset uploads) |
| `WEBFLOW_AGENTS_COLLECTION_ID` | `6a3eeb88509425ae62309159` | Agents collection |
| `WEBFLOW_AREAS_COLLECTION_ID` | `6a3ee7398f36f58b907d2df1` | Areas taxonomy |
| `WEBFLOW_SPECIALTIES_COLLECTION_ID` | `6a3ee77638f548e2e9600bb7` | Specialties taxonomy |

Also site-specific (not collection IDs, but you’ll change them for another brand):

| Setting | Where | Notes |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | `.env` / Cloud env | Origin for “View profile” links (`/agents/{slug}`) |
| `AUTH0_CLAIMS_NAMESPACE` | `.env` / Cloud env | Must match your Auth0 Post Login Action |
| DevLink chrome | `webflow/` | Re-export from the new site |

### Agents collection — custom fields

Slugs must match Webflow exactly (kebab-case). Defined in `src/lib/webflow/types.ts` → `AgentFields`, mapped in `agents.ts`.

| CMS field slug | Type | Used for |
| --- | --- | --- |
| `headshot` | Image | Search cards, profile photo |
| `first-name`, `last-name` | Plain text | Auth0 import (not portal-editable) |
| `email` | Email | Auth0 import |
| `brokerage-name` | Plain text | Search + portal |
| `years-of-experience` | Number | Search sort/display |
| `rating`, `review-count` | Number | Search filter/sort/cards |
| `recent-sales-count` | Number | Search sort/cards |
| `price-range-low`, `price-range-high` | Plain text | Search cards |
| `bio` | Rich text | Search index + portal |
| `license-number` | Plain text | Portal |
| `phone`, `phone-label` | Phone / plain text | Search + portal |
| `street-address`, `city-state-zip` | Plain text | Portal (+ city in search index) |
| `website-name`, `website-url` | Plain text / link | Portal |
| `company-name`, `company-url` | Plain text / link | Search + portal |
| `realtor-badge` | Switch | Search filter (optional UI) |
| `total-listings`, `active-listings-count`, `rent-listings-count`, `worked-with-seller-count` | Number | Indexed / cards (mostly display) |
| `specialties` | Multi-reference → Specialties | Search facets + portal |
| `areas-served` | Multi-reference → Areas | Search facets + portal |

**Areas** and **Specialties** collections only need `name` + `slug` (system fields).

### Portal-editable subset

Not every Agents field is editable in `/profile`. The allowlist is in `src/lib/profile/fields.ts` (`CMS_FIELD_MAP`):

phone, phone-label, street-address, city-state-zip, bio, brokerage-name, license-number, website-name, website-url, company-name, company-url, areas-served, specialties, headshot.

Name, email, ratings, and sales stats are CMS/admin-managed (or Auth0 import), not the portal form.

### Where to change field mappings

If you rename a CMS field slug or add/remove fields, touch these in order:

1. **`src/lib/webflow/types.ts`** — `AgentFields` (raw CMS shape)
2. **`src/lib/webflow/agents.ts`** — `mapAgents()` (denormalize into the app model)
3. **`src/lib/search/document.ts`** — what gets indexed / returned in search results
4. **`src/lib/profile/fields.ts`** — portal allowlist (if agents should edit it)
5. **`src/lib/changelog/diff.ts`** — labels for the admin change log
6. **UI** — `src/pages/index.astro`, `src/lib/ui/card.ts`, `src/pages/profile.astro`

Multi-reference fields return **item IDs** from Webflow; this app resolves them to names/slugs at index time because the API cannot filter on multi-refs server-side.

## License

Private / internal use unless otherwise specified.
