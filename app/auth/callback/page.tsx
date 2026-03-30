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

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session?.access_token) {
        console.error("exchangeCodeForSession:", error);
        sessionStorage.removeItem(STAFF_OAUTH_NEXT_PATH_KEY);
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
