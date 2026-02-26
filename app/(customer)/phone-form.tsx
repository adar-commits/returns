"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhoneForm() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }
      router.push(`/verify-otp?phone=${encodeURIComponent(phone)}`);
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
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05X-XXXXXXX"
          required
          dir="ltr"
          autoComplete="tel"
        />
      </div>
      {error && <div className="msg-error">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "שולח…" : "שלח קוד"}
      </button>
    </form>
  );
}
