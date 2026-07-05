export { getAuthConfig, isAuthConfigured, type AuthConfig } from "./config";
export {
  getAuthCookieName,
  getSessionFromRequest,
  getSessionFromToken,
  getSessionMaxAge,
  getTokenFromCookieHeader,
  isAdmin,
  isAgent,
  verifyToken,
  type AuthSession,
} from "./session";
