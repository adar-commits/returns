"use client";

import { Suspense, useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  getStaffOAuthRedirectBase,
  getStaffOAuthRedirectTo,
  getStaffProductionLoginHref,
  shouldOfferProductionStaffLoginOnly,
  STAFF_OAUTH_NEXT_PATH_KEY,
} from "@/lib/staff-oauth-redirect";
import styles from "./staff-login.module.css";

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.72 32.657 29.376 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c5.37 0 9.712-3.346 11.537-8.046H24v-8h22.148C46.71 22.602 48 25.265 48 28c0 8.837-8.955 20-20 20z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.972 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

const ERROR_HE: Record<string, string> = {
  not_staff: "לחשבון הזה אין הרשאת צוות.",
  exchange_failed: "ההתחברות נכשלה. נסו שוב.",
  missing_code: "חסר קוד אימות. נסו שוב.",
};

const EMAIL_LOGIN_ERROR_STATUS: Record<number, string> = {
  401: "אימייל או סיסמה שגויים.",
  403: "לחשבון הזה אין הרשאת צוות.",
};

function supabaseGoogleRedirectUri(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const base = raw.replace(/\/$/, "");
    return `${base}/auth/v1/callback`;
  } catch {
    return null;
  }
}

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const expectedGoogleRedirect = supabaseGoogleRedirectUri();
  const oauthRedirectBase =
    typeof window !== "undefined" ? getStaffOAuthRedirectBase() : "";
  const oauthRedirectToFull =
    typeof window !== "undefined" ? getStaffOAuthRedirectTo() : "";
  const envOverride = Boolean(process.env.NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN?.trim());
  const productionOnlyLocal =
    typeof window !== "undefined" ? shouldOfferProductionStaffLoginOnly() : false;
  const productionStaffLoginHref =
    typeof window !== "undefined" ? getStaffProductionLoginHref() : null;

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    setError(ERROR_HE[err] || "משהו השתבש. נסו שוב.");
  }, [searchParams]);

  async function signInWithEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("נא למלא אימייל וסיסמה.");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password }),
      });
      if (res.ok) {
        router.push("/staff/requests?preset=week");
        router.refresh();
        return;
      }
      const msg =
        EMAIL_LOGIN_ERROR_STATUS[res.status] || "ההתחברות נכשלה. נסו שוב.";
      setError(msg);
    } catch {
      setError("ההתחברות נכשלה. נסו שוב.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (shouldOfferProductionStaffLoginOnly()) {
      setError("במצב פיתוח יש להתחבר דרך הקישור לאתר הייצור למעלה.");
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STAFF_OAUTH_NEXT_PATH_KEY, "/staff/requests?preset=week");
      }
      const redirectTo =
        typeof window !== "undefined" ? getStaffOAuthRedirectTo() : "/auth/callback";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
        return;
      }
    } catch {
      setError("התחברות עם Google נכשלה.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className={styles.root} dir="rtl" lang="he">
      <div className={styles.grid} aria-hidden />
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.logo} aria-hidden>
            <Image
              src="/hom-group-logo.png"
              alt=""
              width={220}
              height={52}
              priority
              sizes="220px"
              style={{ width: "100%", height: "auto", maxWidth: 220, display: "block" }}
            />
          </div>
        </div>
        <p className={styles.brandText} style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>
          RETURNS HUB
        </p>
        <h1 className={styles.headline}>ברוך הבא</h1>
        <p className={styles.sub}>
          {productionOnlyLocal
            ? "אימייל וסיסמה — כאן. Google — באתר הייצור בלבד (אותו מקור לדפדפן ול־Supabase)."
            : "התחברו עם אימייל או עם Google לאזור הצוות"}
        </p>

        {productionOnlyLocal ? (
          <div className={styles.prodOnlyBanner}>
            <p className={styles.prodOnlyBannerTitle}>מצב פיתוח — כניסת צוות בייצור</p>
            <p className={styles.prodOnlyBannerP}>
              לא ניתן להשלים OAuth מ־localhost: מפתח ה־PKCE נשמר בדפדפן רק באותו אתר שאליו חוזרים אחרי Google.
              פתחו את האתר החי והתחברו משם.
            </p>
            {productionStaffLoginHref ? (
              <>
                <a className={styles.prodPortalBtn} href={productionStaffLoginHref}>
                  מעבר להתחברות באתר הייצור
                </a>
                <p className={styles.prodOnlyNote} dir="ltr">
                  {productionStaffLoginHref}
                </p>
              </>
            ) : (
              <p className={styles.error} role="alert" style={{ marginTop: 0 }}>
                הגדרו <code dir="ltr">NEXT_PUBLIC_APP_URL</code> לאתר הייצור (ב־<code dir="ltr">.env.local</code>).
              </p>
            )}
          </div>
        ) : null}

        <form className={styles.emailForm} onSubmit={signInWithEmail} noValidate>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="staff-email">
              אימייל
            </label>
            <input
              id="staff-email"
              className={styles.fieldInput}
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={emailLoading}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="staff-password">
              סיסמה
            </label>
            <input
              id="staff-password"
              className={styles.fieldInput}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={emailLoading}
            />
          </div>
          <button type="submit" className={styles.emailSubmit} disabled={emailLoading}>
            {emailLoading ? "מתחברים…" : "כניסה"}
          </button>
        </form>

        <div className={styles.divider} role="separator">
          <span>או</span>
        </div>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={signInWithGoogle}
          disabled={googleLoading || productionOnlyLocal}
        >
          <GoogleIcon />
          {googleLoading ? "מפנים…" : "כניסה עם Google"}
        </button>

        {error ? (
          <div ref={errorRef} className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {process.env.NODE_ENV === "development" && expectedGoogleRedirect && !productionOnlyLocal ? (
          <div className={styles.devOauthHint} dir="ltr">
            <strong>Dev — stay on localhost after Google</strong>
            <p className={styles.devOauthHintP}>
              Supabase → Authentication → URL Configuration → <strong>Redirect URLs</strong> must include this{" "}
              <strong>exact</strong> app callback (copy/paste):
            </p>
            <code className={styles.devOauthCode}>{oauthRedirectToFull}</code>
            <p className={styles.devOauthHintP}>
              Browser tab origin: <code>{typeof window !== "undefined" ? window.location.origin : "—"}</code>
              {envOverride ? (
                <>
                  {" "}
                  · OAuth return base (from <code>NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN</code>):{" "}
                  <code>{oauthRedirectBase}</code>
                </>
              ) : null}
            </p>
            {!envOverride &&
            typeof window !== "undefined" &&
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1" ? (
              <p className={styles.devOauthHintWarn}>
                You are not on localhost. If you meant to test locally, open{" "}
                <code>http://localhost:3000/staff/login</code> or set{" "}
                <code>NEXT_PUBLIC_STAFF_OAUTH_REDIRECT_ORIGIN=http://localhost:3000</code> in <code>.env.local</code> and
                whitelist that callback URL above.
              </p>
            ) : null}
            <strong style={{ display: "block", marginTop: "var(--space-3)" }}>Dev — Google Cloud Console</strong>
            <p className={styles.devOauthHintP}>
              Authorized redirect URIs → add (same OAuth client as in Supabase → Auth → Google):
            </p>
            <code className={styles.devOauthCode}>{expectedGoogleRedirect}</code>
            <p className={styles.devOauthHintP}>Must be <code>.supabase.co</code>, not <code>.supabase.co.il</code>.</p>
          </div>
        ) : null}

        {process.env.NODE_ENV === "development" && productionOnlyLocal && expectedGoogleRedirect ? (
          <div className={styles.devOauthHint} dir="ltr">
            <strong>Dev — Supabase (production staff only)</strong>
            <p className={styles.devOauthHintP}>
              Whitelist this app callback on your <strong>production</strong> host (no localhost needed for staff OAuth):
            </p>
            <code className={styles.devOauthCode}>
              {productionStaffLoginHref
                ? new URL("/auth/callback", new URL(productionStaffLoginHref).origin).href
                : "—"}
            </code>
            <p className={styles.devOauthHintP}>
              Google Cloud → Authorized redirect URIs → Supabase callback (must be <code>.supabase.co</code>):
            </p>
            <code className={styles.devOauthCode}>{expectedGoogleRedirect}</code>
          </div>
        ) : null}

        <div className={styles.footer}>
          <span className={styles.footerDot} aria-hidden />
          <span>מאובטח ומוצפן · מופעל על ידי Supabase</span>
        </div>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.root}>
          <div className={styles.grid} aria-hidden />
          <div className={styles.card} style={{ textAlign: "center", color: "rgba(244,244,245,0.6)" }}>
            טוען…
          </div>
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
