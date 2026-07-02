/**
 * URL <-> filter-state helpers and pagination markup, shared between the Astro
 * server render (initial page) and the client script (in-place updates) so the
 * query-param scheme and the pagination controls have a single source of truth.
 *
 * Browser-safe: no Node or heavy imports, so the client bundle can import it.
 */

/** The user-facing search state, as strings (mirrors the URL query params). */
export interface FilterState {
  q: string;
  area: string;
  specialty: string;
  minRating: string;
  /** "1" when restricted to REALTORS®, else "". */
  realtor: string;
  sort: string;
}

/** Read {@link FilterState} out of a URL's query params. */
export function parseFilterState(sp: URLSearchParams): FilterState {
  const realtor = sp.get("realtor");
  return {
    q: sp.get("q") ?? "",
    area: sp.get("area") ?? "",
    specialty: sp.get("specialty") ?? "",
    minRating: sp.get("minRating") ?? "",
    realtor: realtor === "1" || realtor === "true" ? "1" : "",
    sort: sp.get("sort") ?? "relevance",
  };
}

/** Read the 1-indexed page number from a URL's query params (defaults to 1). */
export function parsePage(sp: URLSearchParams): number {
  const n = Number(sp.get("page"));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * Build a query string ("?area=malibu&page=2") from state + page. Omits empty
 * values, the default sort, and page 1 so shareable URLs stay clean.
 */
export function buildQuery(state: FilterState, page: number): string {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.area) p.set("area", state.area);
  if (state.specialty) p.set("specialty", state.specialty);
  if (state.minRating) p.set("minRating", state.minRating);
  if (state.realtor) p.set("realtor", state.realtor);
  if (state.sort && state.sort !== "relevance") p.set("sort", state.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Escape a query string for safe use inside an HTML attribute. */
function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Compute which page numbers to render: always first + last, plus a window of
 * `span` pages either side of the current one, with "…" gaps between runs.
 */
function pageWindow(current: number, totalPages: number, span = 1): (number | "…")[] {
  const wanted = new Set<number>([1, totalPages, current]);
  for (let i = 1; i <= span; i++) {
    wanted.add(current - i);
    wanted.add(current + i);
  }
  const nums = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const slots: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) slots.push("…");
    slots.push(n);
    prev = n;
  }
  return slots;
}

/**
 * Render the pagination control as an HTML string. Page links are real anchors
 * (href set from {@link buildQuery}) so navigation works without JS; the client
 * intercepts clicks on `a[data-page]` for in-place updates. Returns "" when
 * there's only a single page.
 */
export function renderPagination(
  page: number,
  total: number,
  pageSize: number,
  state: FilterState,
): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return "";

  const current = Math.min(Math.max(1, page), totalPages);

  // "?" (not "") for the clean page-1 case so the no-JS href navigates to the
  // base URL instead of reloading the current one.
  const href = (p: number): string => attr(buildQuery(state, p) || "?");

  const numbered = (p: number): string =>
    p === current
      ? `<span class="pagination__page is-current" aria-current="page">${p}</span>`
      : `<a class="pagination__page" href="${href(p)}" data-page="${p}">${p}</a>`;

  const nav = (p: number, label: string, rel: string): string =>
    `<a class="pagination__nav" href="${href(p)}" data-page="${p}" rel="${rel}">${label}</a>`;

  const prev =
    current > 1
      ? nav(current - 1, "‹ Prev", "prev")
      : `<span class="pagination__nav is-disabled">‹ Prev</span>`;
  const next =
    current < totalPages
      ? nav(current + 1, "Next ›", "next")
      : `<span class="pagination__nav is-disabled">Next ›</span>`;

  const middle = pageWindow(current, totalPages)
    .map((p) => (p === "…" ? `<span class="pagination__ellipsis">…</span>` : numbered(p)))
    .join("");

  return `${prev}${middle}${next}`;
}
