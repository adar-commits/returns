"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function safeNext(path: string | null): string {
  const n = path && path.startsWith("/") && !path.startsWith("//") ? path : "/staff";
  return n;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("משלימים התחברות…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const errParam = searchParams.get("error") || searchParams.get("error_description");
      if (errParam) {
        setMessage("שגיאת התחברות");
        router.replace(`/staff/login?error=exchange_failed`);
        return;
      }

      const code = searchParams.get("code");
      const nextPath = safeNext(searchParams.get("next"));

      if (!code) {
        router.replace("/staff/login?error=missing_code");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (error || !data.session?.access_token) {
        console.error("exchangeCodeForSession:", error);
        router.replace("/staff/login?error=exchange_failed");
        return;
      }

      const res = await fetch("/api/staff/oauth-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token }),
      });

      if (cancelled) return;

      if (res.status === 403) {
        router.replace("/staff/login?error=not_staff");
        return;
      }
      if (!res.ok) {
        router.replace("/staff/login?error=exchange_failed");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    }

    run();
    return () => {
      cancelled = true;
    };
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
