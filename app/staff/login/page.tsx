"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

function StaffLoginForm() {
  const searchParams = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    setError(ERROR_HE[err] || "משהו השתבש. נסו שוב.");
  }, [searchParams]);

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/staff`
          : "/auth/callback?next=/staff";
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
            🧶
          </div>
        </div>
        <p className={styles.brandText} style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>
          RETURNS HUB
        </p>
        <h1 className={styles.headline}>ברוך הבא</h1>
        <p className={styles.sub}>התחברו עם Google כדי לגשת לאזור הצוות</p>

        <button type="button" className={styles.googleBtn} onClick={signInWithGoogle} disabled={googleLoading}>
          <GoogleIcon />
          {googleLoading ? "מפנים…" : "כניסה עם Google"}
        </button>

        {error ? (
          <div ref={errorRef} className={styles.error} role="alert">
            {error}
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
