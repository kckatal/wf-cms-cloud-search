/* eslint-disable @typescript-eslint/no-empty-interface */
// Extend after running `npx wrangler types` when bindings change.
interface Env {
  CHANGELOG_KV?: KVNamespace;
  WEBFLOW_API_TOKEN?: string;
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  AUTH0_CALLBACK_URL?: string;
  AUTH0_LOGOUT_RETURN_URL?: string;
  AUTH0_CLAIMS_NAMESPACE?: string;
  PUBLIC_SITE_URL?: string;
  SEARCH_INDEX_TTL_SECONDS?: string;
}
