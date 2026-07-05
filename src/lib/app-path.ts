/**
 * Join Astro's `BASE_URL` (Webflow Cloud mount path) with an app-relative route.
 *
 * `BASE_URL` may be `/`, `/CLOUD_MOUNT_PATH`, or `/CLOUD_MOUNT_PATH/` depending on
 * environment — always use this instead of string concatenation.
 */
export function appPath(route: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const segment = route.replace(/^\//, "");
  if (!base || base === "") return `/${segment}`;
  return `${base}/${segment}`;
}
