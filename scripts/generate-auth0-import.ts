/**
 * Generate auth0-import.json for Auth0 Dashboard bulk user import.
 *
 * Reads agents from Webflow CMS and writes one row per agent with bcrypt-hashed
 * password and app_metadata for the Post Login Action (roles + webflow_agent_id).
 *
 * Run: npm run auth0:import
 *
 * Upload the output in Auth0 Dashboard → User Management → Import Users.
 * https://auth0.com/docs/manage-users/user-migration/bulk-user-imports
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import bcrypt from "bcryptjs";

import { fetchAgents } from "../src/lib/webflow/agents";

const DEFAULT_PASSWORD = "12345qwerty!";
const DEFAULT_OUT = "auth0-import.json";
const DEFAULT_EXCLUDE_SLUGS = ["kc-fletcher"];

export interface Auth0ImportRow {
  email: string;
  email_verified: boolean;
  name: string;
  custom_password_hash: {
    algorithm: "bcrypt";
    hash: { value: string };
  };
  app_metadata: {
    roles: string[];
    webflow_agent_id: string;
  };
}

function parseArgs(argv: string[]) {
  const outFlag = argv.find((arg) => arg.startsWith("--out="));
  const passwordFlag = argv.find((arg) => arg.startsWith("--password="));
  const excludeSlugsFlag = argv.find((arg) => arg.startsWith("--exclude-slugs="));

  const excludeSlugs = excludeSlugsFlag
    ? excludeSlugsFlag
        .slice("--exclude-slugs=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_EXCLUDE_SLUGS;

  return {
    outPath: outFlag?.slice("--out=".length) || DEFAULT_OUT,
    password: passwordFlag?.slice("--password=".length) || process.env.AUTH0_DEFAULT_PASSWORD || DEFAULT_PASSWORD,
    excludeSlugs: new Set(excludeSlugs),
  };
}

async function main(): Promise<void> {
  const { outPath, password, excludeSlugs } = parseArgs(process.argv.slice(2));

  console.log("Fetching agents from Webflow…");
  const agents = await fetchAgents();
  console.log(`  → ${agents.length} agents`);

  const passwordHash = await bcrypt.hash(password, 10);

  const rows: Auth0ImportRow[] = [];
  const skipped: string[] = [];

  for (const agent of agents) {
    if (excludeSlugs.has(agent.slug)) {
      skipped.push(`${agent.name} (${agent.slug})`);
      continue;
    }

    const email = agent.email?.trim().toLowerCase();
    if (!email) {
      skipped.push(`${agent.name} (no email)`);
      continue;
    }

    rows.push({
      email,
      email_verified: true,
      name: agent.name,
      custom_password_hash: {
        algorithm: "bcrypt",
        hash: { value: passwordHash },
      },
      app_metadata: {
        roles: ["agent"],
        webflow_agent_id: agent.id,
      },
    });
  }

  rows.sort((a, b) => a.email.localeCompare(b.email));

  const absoluteOut = resolve(outPath);
  await writeFile(absoluteOut, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  console.log(`Wrote ${rows.length} user(s) to ${absoluteOut}`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`);
    for (const line of skipped) console.log(`  - ${line}`);
  }
}

main().catch((err) => {
  console.error("Failed to generate Auth0 import file:", err);
  process.exitCode = 1;
});
