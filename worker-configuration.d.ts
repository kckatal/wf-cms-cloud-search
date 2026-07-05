/* eslint-disable @typescript-eslint/no-empty-interface */
// Extend after running `npx wrangler types` when bindings change.
interface Env {
  WEBFLOW_API_TOKEN?: string;
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  AUTH0_CALLBACK_URL?: string;
  SEARCH_INDEX_TTL_SECONDS?: string;
}
