"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "not_staff") setError("This account is not a staff user.");
    else if (err === "exchange_failed") setError("Sign-in failed. Try again.");
    else if (err === "missing_code") setError("Missing auth code. Try again.");
    else if (err) setError("Something went wrong. Try again.");
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/staff");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

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
      // Supabase redirects the window; no need to router.push
    } catch (e) {
      setError("Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="page-wrap staff-layout">
      <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
        <h1 className="page-title" style={{ marginBottom: "var(--space-6)" }}>Staff login</h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={signInWithGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? "Redirecting…" : "Sign in with Google"}
        </button>
        <p style={{ textAlign: "center", margin: "var(--space-4) 0", fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>or</p>
        <form onSubmit={onSubmit}>
          <div className="input-wrap">
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <div className="input-wrap">
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          {error && <div ref={errorRef} className="msg-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in…" : "Log in with email"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<main className="page-wrap"><div className="loading-block"><div className="loader" /><span>Loading…</span></div></main>}>
      <StaffLoginForm />
    </Suspense>
  );
}
