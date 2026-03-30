"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STAFF_OAUTH_NEXT_PATH_KEY } from "@/lib/staff-oauth-redirect";

function safeNext(path: string | null): string {
  const n = path && path.startsWith("/") && !path.startsWith("//") ? path : "/staff";
  return n;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("משלימים התחברות…");

  useEffect(() => {
    async function run() {
      const errParam = searchParams.get("error") || searchParams.get("error_description");
      if (errParam) {
        if (typeof window !== "undefined") sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
        setMessage("שגיאת התחברות");
        router.replace(`/staff/login?error=exchange_failed`);
        return;
      }

      const code = searchParams.get("code");
      const fromSession =
        typeof window !== "undefined" ? sessionStorage.getItem(STAFF_OAUTH_NEXT_PATH_KEY) : null;
      const nextPath = safeNext(fromSession || searchParams.get("next"));

      if (!code) {
        if (typeof window !== "undefined") sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
        router.replace("/staff/login?error=missing_code");
        return;
      }

      // #region agent log
      fetch("http://127.0.0.1:7660/ingest/150c9065-00fc-43fb-bb54-57177d17712e", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3b3c00" },
        body: JSON.stringify({
          sessionId: "3b3c00",
          runId: "verify",
          hypothesisId: "H1",
          location: "app/auth/callback/page.tsx:exchange-start",
          message: "callback run",
          data: {
            hasCode: Boolean(code),
            fromSessionLen: fromSession?.length ?? 0,
            nextPath,
            qpNext: searchParams.get("next"),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session?.access_token) {
        console.error("exchangeCodeForSession:", error);
        sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
        // #region agent log
        fetch("http://127.0.0.1:7660/ingest/150c9065-00fc-43fb-bb54-57177d17712e", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3b3c00" },
          body: JSON.stringify({
            sessionId: "3b3c00",
            runId: "verify",
            hypothesisId: "H2",
            location: "app/auth/callback/page.tsx:exchange-fail",
            message: "exchange failed",
            data: { errMsg: error?.message ?? "no_session" },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        router.replace("/staff/login?error=exchange_failed");
        return;
      }

      const res = await fetch("/api/staff/oauth-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token }),
      });

      if (res.status === 403) {
        sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
        router.replace("/staff/login?error=not_staff");
        return;
      }
      if (!res.ok) {
        sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
        router.replace("/staff/login?error=exchange_failed");
        return;
      }

      if (typeof window !== "undefined") sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
      // #region agent log
      fetch("http://127.0.0.1:7660/ingest/150c9065-00fc-43fb-bb54-57177d17712e", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3b3c00" },
        body: JSON.stringify({
          sessionId: "3b3c00",
          runId: "verify",
          hypothesisId: "H3",
          location: "app/auth/callback/page.tsx:success",
          message: "navigating after staff session",
          data: { nextPath, ok: res.ok },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      router.replace(nextPath);
      router.refresh();
    }

    run();
  }, [router, searchParams]);

  return (
    <main className="page-wrap" style={{ textAlign: "center", paddingTop: "var(--space-12)" }}>
      <div className="loading-block">
        <div className="loader" />
        <span>{message}</span>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="page-wrap" style={{ textAlign: "center", paddingTop: "var(--space-12)" }}>
          <div className="loading-block">
            <div className="loader" />
            <span>טוען…</span>
          </div>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
