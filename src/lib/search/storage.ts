/**
 * Read/write the build-time static search index. The index builder writes the
 * bundle; the API route reads it at runtime (falling back to a live fetch when
 * the file is absent).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { AgentDocument } from "./document";

/** Serialized bundle emitted by `scripts/build-index.ts`. */
export interface IndexBundle {
  /** ISO timestamp of when the index was built. */
  generatedAt: string;
  /** Number of agents in the index. */
  count: number;
  /** Serialized MiniSearch index (`JSON.stringify(miniSearch)`). */
  miniSearch: string;
  /** Full document set, used for browse-all and faceting. */
  documents: AgentDocument[];
}

/** Location of the generated index, relative to this module. */
const INDEX_URL = new URL("../../data/agents-index.json", import.meta.url);

export async function writeIndexBundle(bundle: IndexBundle): Promise<string> {
  const path = fileURLToPath(INDEX_URL);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(bundle), "utf8");
  return path;
}

/** Read the static bundle, or return null if it hasn't been built yet. */
export async function readIndexBundle(): Promise<IndexBundle | null> {
  try {
    const raw = await readFile(INDEX_URL, "utf8");
    return JSON.parse(raw) as IndexBundle;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}
