/**
 * Upload a file to the Webflow site Assets panel (two-step: metadata + S3 POST).
 * Requires API token with assets write access (included on site tokens with CMS write).
 */

import { createHash } from "node:crypto";

import { WEBFLOW_API_BASE, getConfig } from "./config";
import type { WebflowImage } from "./types";

interface CreateAssetResponse {
  id: string;
  hostedUrl?: string;
  assetUrl?: string;
  uploadUrl: string;
  uploadDetails: Record<string, string>;
  contentType?: string;
}

function md5Hex(bytes: Uint8Array): string {
  return createHash("md5").update(bytes).digest("hex");
}

export async function uploadSiteAsset(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
): Promise<WebflowImage> {
  const { apiToken, siteId } = getConfig();

  const metaRes = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fileName,
      fileHash: md5Hex(bytes),
    }),
  });

  if (!metaRes.ok) {
    const body = await metaRes.text().catch(() => "");
    if (metaRes.status === 403 && body.includes("assets:write")) {
      throw new Error(
        "Webflow API token is missing assets:write. Generate a new site token with Assets → Read and write, then update WEBFLOW_API_TOKEN in .env and .dev.vars and restart the dev server.",
      );
    }
    throw new Error(`Webflow asset metadata failed (${metaRes.status}): ${body}`);
  }

  const meta = (await metaRes.json()) as CreateAssetResponse;

  const form = new FormData();
  for (const [key, value] of Object.entries(meta.uploadDetails)) {
    form.append(key, value);
  }
  form.append("file", new Blob([bytes], { type: contentType }), fileName);

  const uploadRes = await fetch(meta.uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok && uploadRes.status !== 201) {
    const body = await uploadRes.text().catch(() => "");
    throw new Error(`Webflow asset upload failed (${uploadRes.status}): ${body}`);
  }

  const url = meta.hostedUrl ?? meta.assetUrl;
  if (!url) {
    throw new Error("Webflow asset upload succeeded but no hosted URL was returned.");
  }

  return {
    fileId: meta.id,
    url,
    alt: null,
  };
}
