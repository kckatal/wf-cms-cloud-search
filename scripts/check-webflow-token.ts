/**
 * Quick check that WEBFLOW_API_TOKEN has assets:write (needed for profile photos).
 * Run: npm run webflow:check-token
 */

import { readEnv } from "../src/lib/env";
import { WEBFLOW_API_BASE, getConfig } from "../src/lib/webflow/config";

async function main(): Promise<void> {
  const token = readEnv("WEBFLOW_API_TOKEN");
  if (!token) {
    console.error("WEBFLOW_API_TOKEN is not set (.env or .dev.vars).");
    process.exitCode = 1;
    return;
  }

  const { siteId } = getConfig();
  const preview = `${token.slice(0, 8)}…${token.slice(-4)}`;
  console.log(`Checking token ${preview} against site ${siteId}\n`);

  const res = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fileName: "scope-check.png",
      fileHash: "d41d8cd98f00b204e9800998ecf8427e",
    }),
  });

  const body = await res.text();

  if (res.status === 403 && body.includes("assets:write")) {
    console.error("FAIL: token is missing assets:write.\n");
    console.error("Fix:");
    console.error("  1. Site settings → Apps & integrations → API access");
    console.error("  2. Generate API token (new — scopes cannot be added later)");
    console.error("  3. Enable CMS read/write AND Assets read and write");
    console.error("  4. Paste into .env AND .dev.vars (and Webflow Cloud if deployed)");
    console.error("  5. Restart astro dev");
    process.exitCode = 1;
    return;
  }

  if (res.status === 400 || res.status === 201 || res.ok) {
    console.log("OK: token has assets:write (metadata request accepted).");
    return;
  }

  console.error(`Unexpected response ${res.status}:`, body);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
