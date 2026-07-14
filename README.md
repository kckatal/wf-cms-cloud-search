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

## Adapting

Update collection IDs and field mappings in `src/lib/webflow/`; customize `src/pages/index.astro` and `src/lib/ui/card.ts`; re-export DevLink into `webflow/`.

## License

Private / internal use unless otherwise specified.
