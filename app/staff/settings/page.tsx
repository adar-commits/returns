"use client";

import { useEffect, useState } from "react";

type ShippingTier = { min: number; max: number; fee: number };
type ContentHelpBanner = { text: string; href: string };

const WEBHOOK_KEYS = [
  { key: "otp_send_url", label: "OTP Send", description: "We POST { phone }; you send the code (e.g. via WhatsApp)." },
  { key: "otp_verify_url", label: "OTP Verify", description: "We POST { phone, code }; you return valid/invalid." },
  { key: "orders_webhook_url", label: "Orders", description: "We POST { phone }; you return { orders, customerDetails }." },
  { key: "sizes_webhook_url", label: "Sizes", description: "We POST { sku }; you return { sizes } (replacement options)." },
  { key: "branches_webhook_url", label: "Branches", description: "We GET; you return { branches } (id, name, address, phone, etc.)." },
  { key: "invoices_webhook_url", label: "Invoices", description: "We GET ?ivnum=...; you return { href } (view receipt link)." },
  { key: "final_webhook_url", label: "Final (request filed)", description: "We POST full return request + confirm_url when request is created." },
] as const;

export default function StaffSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eligibilityDays, setEligibilityDays] = useState(30);
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [reasonInput, setReasonInput] = useState("");
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [helpBanner, setHelpBanner] = useState<ContentHelpBanner>({ text: "צריכים עזרה?", href: "" });
  const [headlines, setHeadlines] = useState<Record<string, string>>({});
  const [webhooks, setWebhooks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.eligibility_days != null) setEligibilityDays(data.eligibility_days);
        if (Array.isArray(data.return_reasons)) setReturnReasons(data.return_reasons);
        if (Array.isArray(data.shipping_tiers)) setShippingTiers(data.shipping_tiers);
        if (data.content_help_banner) setHelpBanner(data.content_help_banner);
        if (data.content_headlines) setHeadlines(data.content_headlines);
        const wh: Record<string, string> = {};
        WEBHOOK_KEYS.forEach(({ key }) => {
          if (data[key] != null) wh[key] = data[key];
        });
        setWebhooks(wh);
      })
      .catch(() => setMessage("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eligibility_days: eligibilityDays,
          return_reasons: returnReasons,
          shipping_tiers: shippingTiers,
          content_help_banner: helpBanner,
          content_headlines: Object.keys(headlines).length ? headlines : null,
          ...webhooks,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("Saved.");
    } catch (e) {
      setMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const addReason = () => {
    if (reasonInput.trim()) {
      setReturnReasons((prev) => [...prev, reasonInput.trim()]);
      setReasonInput("");
    }
  };

  const removeReason = (i: number) => {
    setReturnReasons((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addTier = () => {
    setShippingTiers((prev) => [...prev, { min: 0, max: 100, fee: 0 }]);
  };

  const updateTier = (i: number, field: keyof ShippingTier, value: number) => {
    setShippingTiers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const removeTier = (i: number) => {
    setShippingTiers((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (loading) return <p>Loading settings…</p>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1>Settings</h1>
      {message && <p style={{ color: message.startsWith("Failed") ? "crimson" : "green" }}>{message}</p>}

      <section style={{ marginTop: "1.5rem" }}>
        <label>
          <strong>Eligibility (days from order date)</strong>
          <input
            type="number"
            min={1}
            value={eligibilityDays}
            onChange={(e) => setEligibilityDays(Number(e.target.value))}
            style={{ display: "block", marginTop: 4, padding: 6 }}
          />
        </label>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <strong>Return reasons (Hebrew)</strong>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {returnReasons.map((r, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span>{r}</span>
              <button type="button" onClick={() => removeReason(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="New reason"
            style={{ flex: 1, padding: 6 }}
          />
          <button type="button" onClick={addReason}>Add</button>
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <strong>Shipping tiers (₪ min – max → fee)</strong>
        {shippingTiers.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input
              type="number"
              value={t.min}
              onChange={(e) => updateTier(i, "min", Number(e.target.value))}
              style={{ width: 80, padding: 6 }}
            />
            <span>–</span>
            <input
              type="number"
              value={t.max}
              onChange={(e) => updateTier(i, "max", Number(e.target.value))}
              style={{ width: 80, padding: 6 }}
            />
            <span>→ ₪</span>
            <input
              type="number"
              value={t.fee}
              onChange={(e) => updateTier(i, "fee", Number(e.target.value))}
              style={{ width: 80, padding: 6 }}
            />
            <button type="button" onClick={() => removeTier(i)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addTier} style={{ marginTop: 8 }}>Add tier</button>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <strong>Webhook URLs (per action type)</strong>
        <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
          Set the URL for each request type. Leave empty to use environment variables.
        </p>
        {WEBHOOK_KEYS.map(({ key, label, description }) => (
          <div key={key} style={{ marginTop: 12 }}>
            <label style={{ fontWeight: 600, display: "block" }}>{label}</label>
            <p style={{ fontSize: 12, color: "#666", margin: "2px 0 4px" }}>{description}</p>
            <input
              type="url"
              value={webhooks[key] ?? ""}
              onChange={(e) => setWebhooks((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={`${key}`}
              style={{ display: "block", width: "100%", padding: 8, fontFamily: "monospace", fontSize: 13 }}
            />
          </div>
        ))}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <strong>Help banner (“Need Help?”)</strong>
        <div style={{ marginTop: 8 }}>
          <input
            value={helpBanner.text}
            onChange={(e) => setHelpBanner((p) => ({ ...p, text: e.target.value }))}
            placeholder="Text"
            style={{ display: "block", width: "100%", padding: 6, marginBottom: 8 }}
          />
          <input
            value={helpBanner.href}
            onChange={(e) => setHelpBanner((p) => ({ ...p, href: e.target.value }))}
            placeholder="Link (e.g. WhatsApp)"
            style={{ display: "block", width: "100%", padding: 6 }}
          />
        </div>
      </section>

      <div style={{ marginTop: "2rem" }}>
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
