"use client";

import { useEffect, useState } from "react";

type ShippingTier = { min: number; max: number; fee: number };
type ContentHelpBanner = { text: string; href: string };
type BranchItem = { id: string; name: string; address?: string; state?: string };

const WEBHOOK_KEYS = [
  { key: "otp_send_url", label: "OTP Send", description: "We POST { phone, code }; you deliver the code (e.g. via WhatsApp). We verify locally." },
  { key: "orders_webhook_url", label: "Orders", description: "We POST { phone }; you return { orders, customerDetails }. Include receipt_href per order if desired." },
  { key: "sizes_webhook_url", label: "Sizes", description: "We POST { sku }; you return { sizes } (replacement options)." },
  { key: "branches_webhook_url", label: "Branches", description: "We GET; you return { branches } (id, name, address, phone, opening_hours, map_url)." },
  { key: "invoices_webhook_url", label: "Invoices", description: "We GET with ?ivnum=...; you return { href } (receipt link for “צפה בקבלה”)." },
  { key: "final_webhook_url", label: "Final (request filed)", description: "We POST full return request + confirm_url when request is created." },
] as const;

export default function StaffSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eligibilityDays, setEligibilityDays] = useState(900);
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [reasonInput, setReasonInput] = useState("");
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [helpBanner, setHelpBanner] = useState<ContentHelpBanner>({ text: "צריכים עזרה?", href: "" });
  const [headlines, setHeadlines] = useState<Record<string, string>>({});
  const [webhooks, setWebhooks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [restrictedSkus, setRestrictedSkus] = useState<string[]>([]);
  const [restrictedSkuInput, setRestrictedSkuInput] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(() => {});
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
        if (Array.isArray(data.restricted_skus)) setRestrictedSkus(data.restricted_skus);
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
          restricted_skus: restrictedSkus,
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

  if (loading) return <div className="loading-block"><div className="loader" /><span>Loading settings…</span></div>;

  return (
    <div className="staff-layout">
      <h1 className="page-title">Settings</h1>
      {message && <div className={message.startsWith("Failed") ? "msg-error" : "msg-success"} style={{ marginBottom: "var(--space-4)" }}>{message}</div>}

      <div className="card">
        <p className="card-title">Eligibility</p>
        <div className="input-wrap">
          <label className="input-label">Days from order date (eligible for return)</label>
          <input type="number" min={1} className="input" value={eligibilityDays} onChange={(e) => setEligibilityDays(Number(e.target.value))} style={{ maxWidth: 120 }} />
        </div>
      </div>

      <div className="card">
        <p className="card-title">Return reasons (Hebrew)</p>
        <ul className="list-plain">
          {returnReasons.map((r, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <span>{r}</span>
              <button type="button" className="btn btn-ghost" style={{ width: "auto", minWidth: 0, padding: "var(--space-2)" }} onClick={() => removeReason(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <input className="input" value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} placeholder="New reason" style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" style={{ width: "auto", minWidth: 0 }} onClick={addReason}>Add</button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Restricted SKUs</p>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Items with these SKUs will not appear on the return/replace selection page. One SKU per line or comma-separated.
        </p>
        <ul className="list-plain">
          {restrictedSkus.map((sku, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <code style={{ fontSize: "var(--text-small)", background: "var(--color-surface-elevated)", padding: "2px 6px", borderRadius: 4 }}>{sku}</code>
              <button type="button" className="btn btn-ghost" style={{ width: "auto", minWidth: 0, padding: "var(--space-2)" }} onClick={() => setRestrictedSkus((prev) => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <input
            className="input"
            value={restrictedSkuInput}
            onChange={(e) => setRestrictedSkuInput(e.target.value)}
            placeholder="SKU (e.g. 33600090-160230) or multiple comma-separated"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "auto", minWidth: 0 }}
            onClick={() => {
              const toAdd = restrictedSkuInput.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
              if (toAdd.length) {
                setRestrictedSkus((prev) => Array.from(new Set([...prev, ...toAdd])));
                setRestrictedSkuInput("");
              }
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Shipping tiers (₪ min – max → fee)</p>
        {shippingTiers.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
            <input type="number" className="input" value={t.min} onChange={(e) => updateTier(i, "min", Number(e.target.value))} style={{ width: 80 }} />
            <span>–</span>
            <input type="number" className="input" value={t.max} onChange={(e) => updateTier(i, "max", Number(e.target.value))} style={{ width: 80 }} />
            <span>→ ₪</span>
            <input type="number" className="input" value={t.fee} onChange={(e) => updateTier(i, "fee", Number(e.target.value))} style={{ width: 80 }} />
            <button type="button" className="btn btn-ghost" style={{ width: "auto", minWidth: 0, padding: "var(--space-2)" }} onClick={() => removeTier(i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" style={{ width: "auto", marginTop: "var(--space-2)" }} onClick={addTier}>Add tier</button>
      </div>

      <div className="card">
        <p className="card-title">Webhook URLs</p>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>Per action type. Empty = use env.</p>
        {WEBHOOK_KEYS.map(({ key, label, description }) => (
          <div key={key} className="input-wrap">
            <label className="input-label">{label}</label>
            <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 var(--space-2)" }}>{description}</p>
            <input type="url" className="input" value={webhooks[key] ?? ""} onChange={(e) => setWebhooks((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={key} style={{ fontFamily: "monospace" }} />
          </div>
        ))}
      </div>

      <div className="card">
        <p className="card-title">Help banner (“Need Help?”)</p>
        <div className="input-wrap">
          <input className="input" value={helpBanner.text} onChange={(e) => setHelpBanner((p) => ({ ...p, text: e.target.value }))} placeholder="Text" />
        </div>
        <div className="input-wrap">
          <input className="input" value={helpBanner.href} onChange={(e) => setHelpBanner((p) => ({ ...p, href: e.target.value }))} placeholder="Link (e.g. WhatsApp)" />
        </div>
      </div>

      <div className="card">
        <p className="card-title">Terms & Policy links (Summary page)</p>
        <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          These links appear as clickable text inside the required checkbox on the Summary page. Leave blank to show plain (unlinked) text.
        </p>
        <div className="input-wrap">
          <label className="input-label">פורטל החזרות — link URL</label>
          <input
            type="url"
            className="input"
            value={headlines["terms_portal_url"] ?? ""}
            onChange={(e) =>
              setHeadlines((prev) => ({ ...prev, terms_portal_url: e.target.value }))
            }
            placeholder="https://example.com/terms"
            style={{ fontFamily: "monospace" }}
          />
        </div>
        <div className="input-wrap">
          <label className="input-label">מדיניות המשלוחים והביטולים — link URL</label>
          <input
            type="url"
            className="input"
            value={headlines["terms_shipping_url"] ?? ""}
            onChange={(e) =>
              setHeadlines((prev) => ({ ...prev, terms_shipping_url: e.target.value }))
            }
            placeholder="https://example.com/shipping-policy"
            style={{ fontFamily: "monospace" }}
          />
        </div>
      </div>

      {branches.length > 0 && (
        <div className="card">
          <p className="card-title">Waze links per branch</p>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            Paste a Waze deep-link for each branch. Shown as a navigation icon on the customer shipping page.
          </p>
          {branches.map((b) => (
            <div key={b.id} className="input-wrap">
              <label className="input-label">{b.name}{b.address ? ` — ${b.address}` : ""}</label>
              <input
                type="url"
                className="input"
                value={headlines[`waze_${b.id}`] ?? ""}
                onChange={(e) =>
                  setHeadlines((prev) => ({
                    ...prev,
                    [`waze_${b.id}`]: e.target.value,
                  }))
                }
                placeholder="https://waze.com/ul?ll=..."
                style={{ fontFamily: "monospace" }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button" className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: "var(--space-4)" }}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
