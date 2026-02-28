"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RESEND_COOLDOWN = 60;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    codeInputRef.current?.focus();
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCountdown > 0 || resending) return;
    setResendMsg(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        setResendMsg("הקוד נשלח מחדש");
        startTimer();
      } else {
        setResendMsg("שגיאה בשליחה, נסה שוב");
      }
    } finally {
      setResending(false);
    }
  }

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
        נשלחה אליך הודעת <strong>WhatsApp</strong> עם קוד. הזן/י את הקוד להמשך.
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

      {/* Resend section */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-4)", marginTop: "-var(--space-2)" }}>
        {resendCountdown > 0 ? (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
            לא קיבלת קוד? שלח מחדש בעוד{" "}
            <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{resendCountdown}</span> שניות
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "var(--text-small)",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            {resending ? "שולח…" : "לא קיבלת קוד? שלח מחדש"}
          </button>
        )}
        {resendMsg && (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-success)", marginTop: 4 }}>{resendMsg}</p>
        )}
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
