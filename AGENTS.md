## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

# Woodland Properties — Agent Search & Filter

## What this is

An Astro cloud app (Webflow Data Client) that serves a search/filter page
for a real estate agent directory. Must be performant at 3,000+ agents.

## Architecture

- Client-side search index pattern (not per-request API filtering)
- Fetch all agents at build/cache time from Webflow CDN API
- Resolve multi-reference IDs (Areas, Specialties) into searchable strings
- Serve flattened JSON index to the frontend
- Client-side faceted filtering (instant, no round trips)

## Webflow CMS Schema

Site ID: 6a3ee562ea51d6c9ddc156c7

### Collections

- **Agents** (6a3eeb88509425ae62309159) — 51 items
  - Name, Slug (system)
  - Headshot (Image), Brokerage Name (PlainText)
  - Years of Experience (Number), Rating (Number), Review Count (Number)
  - Recent Sales Count (Number)
  - Price Range Low (PlainText), Price Range High (PlainText)
  - Bio (RichText), License Number (PlainText)
  - Phone (Phone), Phone Label (PlainText)
  - Street Address (PlainText), City State Zip (PlainText)
  - Website Name (PlainText), Website URL (Link)
  - Company Name (PlainText), Company URL (Link)
  - Partner Badge Text (PlainText), Realtor Badge (Switch)
  - Total Listings (Number), Active Listings Count (Number)
  - Rent Listings Count (Number), Worked With Seller Count (Number)
  - Specialties (MultiReference → Specialties collection)
  - Areas Served (MultiReference → Areas collection)

- **Areas** (6a3ee7398f36f58b907d2df1) — 50 items
  - Name, Slug only

- **Specialties** (6a3ee77638f548e2e9600bb7) — 20 items
  - Name, Slug only

## API Details

- CDN read endpoint: https://api-cdn.webflow.com/v2/collections/{id}/items/live
- Max 100 items per page, paginate with offset
- Multi-reference fields return arrays of item IDs (NOT resolved names)
- Multi-reference filtering is NOT supported server-side
- Number fields support gt/gte/lt/lte filtering and sort
- PlainText supports eq/ne/contains

## Key Design Decisions

- Price range fields are PlainText — parse to numeric at index build time
- Index should be ~300-500KB gzipped for 3,000 agents
- Use webhooks (collection_item_changed, collection_item_published) for cache invalidation
- Fuse.js or similar for fuzzy name search

## Filter Dimensions

- Area (multi-select, from Areas collection)
- Specialty (multi-select, from Specialties collection)
- Rating (min threshold, e.g. 4+, 5 only)
- Years of Experience (range slider or brackets)
- Price Range (range)
- Name (text search, fuzzy)
- Realtor Badge (toggle)
