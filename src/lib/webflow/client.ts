/**
 * Webflow API clients for CMS collection items.
 *
 * - Content Delivery (CDN): search index reads — published live items only
 * - Data API: profile editing — get/update/publish
 */

import {
  WEBFLOW_API_BASE,
  WEBFLOW_CDN_API_BASE,
  getConfig,
  type WebflowConfig,
} from "./config";
import type { CmsListResponse, RawCmsItem } from "./types";

const PAGE_SIZE = 100; // Webflow's max per request.

export class WebflowClient {
  private readonly config: WebflowConfig;

  constructor(config: WebflowConfig = getConfig()) {
    this.config = config;
  }

  private async request<T>(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
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

  private dataRequest<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request(WEBFLOW_API_BASE, path, init);
  }

  private cdnRequest<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request(WEBFLOW_CDN_API_BASE, path, init);
  }

  // --- Content Delivery API (search / public reads) ---

  /**
   * Fetch every published live item via the CDN content delivery API.
   * @see https://developers.webflow.com/data/v2.0.0/docs/working-with-the-cms/content-delivery
   */
  async listAllLiveItems<TFields = Record<string, unknown>>(
    collectionId: string,
  ): Promise<RawCmsItem<TFields>[]> {
    const all: RawCmsItem<TFields>[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.cdnRequest<CmsListResponse<TFields>>(
        `/collections/${collectionId}/items/live?limit=${PAGE_SIZE}&offset=${offset}`,
      );

      all.push(...page.items);
      offset += page.items.length;

      if (page.items.length === 0 || offset >= page.pagination.total) break;
    }

    return all.filter((item) => !item.isArchived);
  }

  async getLiveItem<TFields = Record<string, unknown>>(
    collectionId: string,
    itemId: string,
  ): Promise<RawCmsItem<TFields> | null> {
    try {
      return await this.cdnRequest<RawCmsItem<TFields>>(
        `/collections/${collectionId}/items/${itemId}/live`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("404")) return null;
      throw err;
    }
  }

  // --- Data API (profile editing) ---

  async getItem<TFields = Record<string, unknown>>(
    collectionId: string,
    itemId: string,
  ): Promise<RawCmsItem<TFields> | null> {
    try {
      return await this.dataRequest<RawCmsItem<TFields>>(
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
    return this.dataRequest<RawCmsItem<TFields>>(`/collections/${collectionId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ fieldData }),
    });
  }

  async publishItems(collectionId: string, itemIds: string[]): Promise<void> {
    await this.dataRequest(`/collections/${collectionId}/items/publish`, {
      method: "POST",
      body: JSON.stringify({ itemIds }),
    });
  }
}
