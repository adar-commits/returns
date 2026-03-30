import { DEFAULT_APP_URL } from "@/lib/constants";

/** sessionStorage key: where to send staff after OAuth (path only, e.g. /staff). */
export const STAFF_OAUTH_NEXT_PATH_KEY = "returns_staff_oauth_next";

function envTruthy(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** When true, localhost /staff/login does not start Google OAuth (PKCE must stay on one origin); use production URL instead. */
export function staffOauthProductionOnly(): boolean {
  return envTruthy(process.env.NEXT_PUBLIC_STAFF_OAUTH_PRODUCTION_ONLY);
}

export function isLocalStaffBrowserOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Full URL to production (or canonical app) staff login — uses NEXT_PUBLIC_APP_URL, else DEFAULT_APP_URL.
 */
export function getStaffProductionLoginHref(): string | null {
  const raw = (process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL).trim();
  try {
    const u = new URL(raw);
    return `${u.origin}/staff/login`;
  } catch {
    return null;
  }
}

export function shouldOfferProductionStaffLoginOnly(): boolean {
  return staffOauthProductionOnly() && isLocalStaffBrowserOrigin();
}

/**
 * OAuth return URL for staff Google sign-in (path only, no query).
 * Supabase Redirect URLs must match exactly; `.../auth/callback?next=...` often fails if only
 * `.../auth/callback` is whitelisted — use sessionStorage for the post-login path instead.
 *
 * Set NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN in .env.local when the browser origin
 * (e.g. http://127.0.0.1:3000) is not whitelisted in Supabase — use the exact origin
 * you added under Authentication → URL Configuration → Redirect URLs (e.g. http://localhost:3000).
 */
export function getStaffOAuthRedirectBase(): string {
  const raw = process.env.NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* ignore invalid env */
    }
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getStaffOAuthRedirectTo(): string {
  const base = getStaffOAuthRedirectBase();
  if (!base) return "/auth/callback";
  return `${base}/auth/callback`;
}
