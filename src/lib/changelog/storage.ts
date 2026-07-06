import { env } from "cloudflare:workers";

import type { ChangelogEntry, ChangelogListResult } from "./types";

const INDEX_KEY = "changelog:index";
const ENTRY_PREFIX = "changelog:entry:";
const MAX_ENTRIES = 500;

/** In-memory fallback when KV is not bound (local `astro dev`). */
const memoryIndex: string[] = [];
const memoryEntries = new Map<string, ChangelogEntry>();

function getKv(): KVNamespace | null {
  try {
    return env.CHANGELOG_KV ?? null;
  } catch {
    return null;
  }
}

function entryKey(id: string): string {
  return `${ENTRY_PREFIX}${id}`;
}

async function readIndex(kv: KVNamespace | null): Promise<string[]> {
  if (!kv) return [...memoryIndex];

  const raw = await kv.get(INDEX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function writeIndex(kv: KVNamespace | null, ids: string[]): Promise<void> {
  if (!kv) {
    memoryIndex.length = 0;
    memoryIndex.push(...ids);
    return;
  }

  await kv.put(INDEX_KEY, JSON.stringify(ids));
}

export interface AppendChangelogInput {
  agentId: string;
  agentName: string;
  agentSlug: string;
  userSub: string;
  userEmail: string | null;
  userName: string | null;
  changes: ChangelogEntry["changes"];
}

export async function appendChangelogEntry(input: AppendChangelogInput): Promise<ChangelogEntry> {
  const entry: ChangelogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  };

  const kv = getKv();
  const key = entryKey(entry.id);

  if (kv) {
    await kv.put(key, JSON.stringify(entry));
  } else {
    memoryEntries.set(entry.id, entry);
  }

  const index = await readIndex(kv);
  index.unshift(entry.id);
  const trimmed = index.slice(0, MAX_ENTRIES);
  const removed = index.slice(MAX_ENTRIES);

  await writeIndex(kv, trimmed);

  if (kv) {
    await Promise.all(removed.map((id) => kv.delete(entryKey(id))));
  } else {
    for (const id of removed) {
      memoryEntries.delete(id);
    }
  }

  return entry;
}

export async function listChangelogEntries(options?: {
  limit?: number;
  offset?: number;
}): Promise<ChangelogListResult> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);

  const kv = getKv();
  const index = await readIndex(kv);
  const slice = index.slice(offset, offset + limit);

  const entries = await Promise.all(
    slice.map(async (id) => {
      if (kv) {
        const raw = await kv.get(entryKey(id));
        if (!raw) return null;
        try {
          return JSON.parse(raw) as ChangelogEntry;
        } catch {
          return null;
        }
      }
      return memoryEntries.get(id) ?? null;
    }),
  );

  return {
    entries: entries.filter((entry): entry is ChangelogEntry => entry != null),
    total: index.length,
  };
}
