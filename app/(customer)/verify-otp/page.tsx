"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }
      router.push("/orders");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <p style={{ marginBottom: 8 }}>רק עוד רגע..</p>
      <p style={{ marginBottom: 8 }}>ברגעים אלה נשלחת לך הודעת WhatsApp עם קוד התחברות. נא להקליד את הקוד להמשך התהליך.</p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="קוד"
        required
        dir="ltr"
        style={{ width: "100%", padding: 12, marginBottom: 12, fontSize: 18, letterSpacing: 4 }}
      />
      {error && <p style={{ color: "crimson", marginBottom: 8 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, backgroundColor: "#8B4513", color: "white", border: "none", borderRadius: 6 }}>
        {loading ? "בודק…" : "אשר קוד"}
      </button>
    </form>
  );
}

export default function VerifyOtpPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>מרכז ההחלפות וההחזרות</h1>
      <Suspense fallback={<p>טוען…</p>}>
        <VerifyForm />
      </Suspense>
    </main>
  );
}
