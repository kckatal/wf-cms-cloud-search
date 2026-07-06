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

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${WEBFLOW_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Webflow API ${res.status} ${res.statusText} for ${path}: ${body}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async getItem<TFields = Record<string, unknown>>(
    collectionId: string,
    itemId: string,
  ): Promise<RawCmsItem<TFields> | null> {
    try {
      return await this.request<RawCmsItem<TFields>>(
        `/collections/${collectionId}/items/${itemId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("404")) return null;
      throw err;
    }
  }

  async updateItem<TFields = Record<string, unknown>>(
    collectionId: string,
    itemId: string,
    fieldData: Record<string, unknown>,
  ): Promise<RawCmsItem<TFields>> {
    return this.request<RawCmsItem<TFields>>(`/collections/${collectionId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ fieldData }),
    });
  }

  async publishItems(collectionId: string, itemIds: string[]): Promise<void> {
    await this.request(`/collections/${collectionId}/items/publish`, {
      method: "POST",
      body: JSON.stringify({ itemIds }),
    });
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
