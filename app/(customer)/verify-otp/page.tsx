"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

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
      // Prefetch orders in background so /orders loads instantly (session is now set)
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json().catch(() => ({}));
        try {
          sessionStorage.setItem("orders_prefetch", JSON.stringify({ orders: ordersData.orders || [], customerDetails: ordersData.customerDetails || ordersData.customer_details, at: Date.now() }));
        } catch (_) {}
      }
      router.push("/orders");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="page-subtitle" style={{ marginBottom: 8 }}>
        נשלחה אליך הודעת WhatsApp עם קוד. הזן/י את הקוד להמשך.
      </p>
      <div className="input-wrap">
        <label className="input-label" htmlFor="otp-code">קוד</label>
        <input
          ref={codeInputRef}
          id="otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          required
          dir="ltr"
          style={{ fontSize: "1.25rem", letterSpacing: "0.4em", textAlign: "center" }}
        />
      </div>
      {error && <div className="msg-error">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "בודק…" : "אשר קוד"}
      </button>
    </form>
  );
}

export default function VerifyOtpPage() {
  return (
    <main className="page-wrap">
      <h1 className="page-title">אימות קוד</h1>
      <Suspense fallback={<div className="loading-block"><div className="loader" /><span>טוען…</span></div>}>
        <div className="card"><VerifyForm /></div>
      </Suspense>
    </main>
  );
}
