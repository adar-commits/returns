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
      <p style={{ marginBottom: 8 }}>הקלד/י את מספר הטלפון של המזמינ/ה</p>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="טלפון"
        required
        dir="ltr"
        style={{ width: "100%", padding: 12, marginBottom: 12, fontSize: 16 }}
      />
      {error && <p style={{ color: "crimson", marginBottom: 8 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, backgroundColor: "#8B4513", color: "white", border: "none", borderRadius: 6 }}>
        {loading ? "שולח…" : "שלח קוד"}
      </button>
    </form>
  );
}
