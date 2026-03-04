"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

/** Digits only; must start with 05 (Israeli mobile). No + or other chars. Reject leading 97. */
function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("9725")) return "05" + digits.slice(4).slice(0, 9);
  if (digits.startsWith("972")) return "05" + digits.slice(3).slice(0, 9);
  if (digits.startsWith("97")) return "";
  if (digits.length === 1) return digits === "0" ? "0" : "";
  if (digits[0] !== "0") return "";
  if (digits.length === 2) return digits[1] === "5" ? "05" : "0";
  return digits.startsWith("05") ? digits.slice(0, 11) : "05" + digits.slice(2).slice(0, 9);
}

function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("05") && digits.length >= 10 && digits.length <= 11;
}

export default function PhoneForm() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPhoneValid(phone)) {
      setError("הזן מספר טלפון תקין שמתחיל ב-05");
      return;
    }
    setLoading(true);
    try {
      const digitsOnly = phone.replace(/\D/g, "");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digitsOnly }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }
      router.push(`/verify-otp?phone=${encodeURIComponent(digitsOnly)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="input-wrap">
        <label className="input-label" htmlFor="phone">מספר טלפון</label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          className="input"
          value={phone}
          onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
          placeholder="05X-XXXXXXX"
          required
          dir="ltr"
          autoComplete="tel"
          maxLength={11}
        />
      </div>
      {error && <div ref={errorRef} className="msg-error">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "שולח…" : "שלח קוד"}
      </button>
    </form>
  );
}
