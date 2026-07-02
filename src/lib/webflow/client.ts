/**
 * Minimal Webflow Data API v2 client. Only covers the read endpoints the search
 * layer needs (listing CMS collection items, with pagination).
 */

import { WEBFLOW_API_BASE, getConfig, type WebflowConfig } from "./config";
import type { CmsListResponse, RawCmsItem } from "./types";

const PAGE_SIZE = 100; // Webflow's max per request.

export class WebflowClient {
  private readonly config: WebflowConfig;

  constructor(config: WebflowConfig = getConfig()) {
    this.config = config;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${WEBFLOW_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Webflow API ${res.status} ${res.statusText} for ${path}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Fetch every live (non-draft, non-archived) item in a collection, following
   * pagination until exhausted.
   */
  async listAllItems<TFields = Record<string, unknown>>(
    collectionId: string,
  ): Promise<RawCmsItem<TFields>[]> {
    const all: RawCmsItem<TFields>[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.request<CmsListResponse<TFields>>(
        `/collections/${collectionId}/items?limit=${PAGE_SIZE}&offset=${offset}`,
      );

      all.push(...page.items);
      offset += page.items.length;

      if (page.items.length === 0 || offset >= page.pagination.total) break;
    }

    return all.filter((item) => !item.isDraft && !item.isArchived);
  }
}
