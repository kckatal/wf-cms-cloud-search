/**
 * React island for the Webflow DevLink navbar.
 *
 * DevLink components are React and rely on Webflow Interactions (e.g. the mobile
 * menu toggle), which require `DevLinkProvider` as an ancestor. Astro islands are
 * isolated React roots, so the provider must wrap the component *inside* this
 * island. Render it from .astro with a client directive (e.g. `client:load`).
 */
import { DevLinkProvider } from "webflow/DevLinkProvider";
import { NavbarPrimary } from "webflow/NavbarPrimary";

export default function SiteNav() {
  return (
    <DevLinkProvider>
      <NavbarPrimary />
    </DevLinkProvider>
  );
}
