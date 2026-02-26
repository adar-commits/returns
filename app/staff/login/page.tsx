"use client";

import { Suspense, useState, useEffect } from "react";
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
    <main style={{ padding: "2rem", maxWidth: 400, margin: "0 auto" }}>
      <h1>Staff login</h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googleLoading}
        style={{
          display: "block",
          width: "100%",
          padding: 12,
          marginBottom: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fff",
          cursor: googleLoading ? "wait" : "pointer",
          fontSize: 15,
        }}
      >
        {googleLoading ? "Redirecting…" : "Sign in with Google"}
      </button>
      <p style={{ textAlign: "center", marginBottom: 16, color: "#666" }}>or</p>
      <form onSubmit={onSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          style={{ display: "block", width: "100%", padding: 10, marginBottom: 12 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          style={{ display: "block", width: "100%", padding: 10, marginBottom: 12 }}
        />
        {error && <p style={{ color: "crimson", marginBottom: 8 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: 10, width: "100%" }}>
          {loading ? "Logging in…" : "Log in with email"}
        </button>
      </form>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem", maxWidth: 400, margin: "0 auto" }}><p>Loading…</p></main>}>
      <StaffLoginForm />
    </Suspense>
  );
}
