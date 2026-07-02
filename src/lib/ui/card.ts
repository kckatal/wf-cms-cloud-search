/**
 * Renders an agent search result as an HTML string. Shared between the Astro
 * server render (initial page) and the client script (re-render on filter
 * change) so the card markup has a single source of truth.
 */

import type { SearchResultItem } from "../search";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStars(rating: number | null): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += `<span class="star${i < filled ? " star--on" : ""}">★</span>`;
  }
  return `<span class="stars" aria-label="${rating ?? 0} out of 5">${out}</span>`;
}

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

/** "R" REALTOR® badge, shown when the agent has the realtor flag. */
const REALTOR_BADGE = `<span class="realtor-badge" title="REALTOR®">R</span>`;

export function renderCard(agent: SearchResultItem): string {
  const company = agent.brokerageName || agent.companyName || "";
  const initial = (agent.name?.[0] ?? "?").toUpperCase();

  const headshot = agent.headshotUrl
    ? `<img class="agent-card__photo" src="${escapeHtml(agent.headshotUrl)}" alt="${escapeHtml(agent.name)}" loading="lazy" width="96" height="96" />`
    : `<div class="agent-card__photo agent-card__photo--fallback" aria-hidden="true">${escapeHtml(initial)}</div>`;

  const ratingLine =
    agent.rating != null
      ? `<div class="agent-card__rating">
           <strong>${agent.rating.toFixed(1)}</strong>
           ${renderStars(agent.rating)}
         </div>`
      : "";

  const reviewStats: string[] = [];
  if (agent.reviewCount != null) reviewStats.push(plural(agent.reviewCount, "review"));
  if (agent.totalListings != null) reviewStats.push(plural(agent.totalListings, "listing"));

  const price =
    agent.priceRangeLow && agent.priceRangeHigh
      ? `<div class="agent-card__price"><strong>${escapeHtml(agent.priceRangeLow)} – ${escapeHtml(agent.priceRangeHigh)}</strong> price range</div>`
      : "";

  const sales =
    agent.recentSalesCount != null
      ? `<div class="agent-card__sales"><strong>${agent.recentSalesCount.toLocaleString()}</strong> sales in last 12 months</div>`
      : "";

  const tags =
    agent.specialties.length > 0
      ? `<ul class="agent-card__tags">${agent.specialties
          .slice(0, 4)
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join("")}</ul>`
      : "";

  const areaLine =
    agent.areas.length > 0
      ? `<p class="agent-card__areas">Serves ${escapeHtml(agent.areas.slice(0, 3).join(", "))}</p>`
      : "";

  return `
    <article class="agent-card">
      ${headshot}
      <div class="agent-card__body">
        <h3 class="agent-card__name">
          <a href="#agent-${escapeHtml(agent.slug)}">${escapeHtml(agent.name)}</a>
          ${agent.realtorBadge ? REALTOR_BADGE : ""}
        </h3>
        ${company ? `<p class="agent-card__company">${escapeHtml(company)}</p>` : ""}
        <div class="agent-card__stats">
          <div class="agent-card__col">
            ${ratingLine}
            ${reviewStats.length ? `<div class="agent-card__meta">${reviewStats.join(" • ")}</div>` : ""}
          </div>
          <div class="agent-card__col">
            ${price}
            ${sales}
          </div>
        </div>
        ${areaLine}
        ${tags}
      </div>
    </article>`;
}
