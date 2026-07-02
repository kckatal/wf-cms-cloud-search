/**
 * Build-time search index builder.
 *
 * Fetches all agents (with resolved references) from Webflow, converts them into
 * search documents, builds a MiniSearch index, and writes the serialized bundle
 * to `src/data/agents-index.json`.
 *
 * Run with: `npm run build:index` (loads .env via Node's --env-file-if-exists).
 */

import { fetchAgents } from "../src/lib/webflow/agents";
import { toDocument } from "../src/lib/search/document";
import { buildBundle } from "../src/lib/search/index";
import { writeIndexBundle } from "../src/lib/search/storage";

async function main(): Promise<void> {
  console.log("Fetching agents from Webflow…");
  const agents = await fetchAgents();
  console.log(`  → ${agents.length} agents`);

  const documents = agents.map(toDocument);
  const bundle = buildBundle(documents);

  const path = await writeIndexBundle(bundle);
  console.log(`Wrote index (${bundle.count} agents) to ${path}`);
}

main().catch((err) => {
  console.error("Failed to build index:", err);
  process.exitCode = 1;
});
