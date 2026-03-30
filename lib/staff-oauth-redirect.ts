/** sessionStorage key: where to send staff after OAuth (path only, e.g. /staff). */
export const STAFF_OAUTH_NEXT_PATH_KEY = "returns_staff_oauth_next";

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
