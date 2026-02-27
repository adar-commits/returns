"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function SizeImageGallery({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  const n = urls.length;
  useEffect(() => setIndex(0), [urls.length]);
  if (n === 0) return null;
  if (n === 1) return <img src={urls[0]} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6 }} />;
  const prev = () => setIndex((i) => (i - 1 + n) % n);
  const next = () => setIndex((i) => (i + 1) % n);
  return (
    <div style={{ position: "relative", width: 96, height: 96 }}>
      <img src={urls[index]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
      <button type="button" aria-label="Previous" onClick={prev} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--color-border)", background: "var(--color-surface)", cursor: "pointer", fontSize: 14 }}>‹</button>
      <button type="button" aria-label="Next" onClick={next} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--color-border)", background: "var(--color-surface)", cursor: "pointer", fontSize: 14 }}>›</button>
      <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, alignItems: "center" }}>
        {n <= 8
          ? urls.map((_, i) => (
              <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i === index ? "var(--color-primary)" : "rgba(255,255,255,0.6)" }} />
            ))
          : <span style={{ fontSize: 10, color: "#fff", textShadow: "0 0 2px #000" }}>{index + 1}/{n}</span>}
      </div>
    </div>
  );
}

type LineItem = { sku: string; product_name?: string; price?: number; [key: string]: unknown };
type ItemChoice = { sku: string; action: "return" | "replace"; reason_id?: string; selected_size_id?: string; size_label?: string; size_price?: number };
type SizeOption = { id: string; label?: string; price?: number; image?: string; images?: string[] };

export default function ItemSelection({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<{ items?: LineItem[]; [key: string]: unknown } | null>(null);
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [choices, setChoices] = useState<ItemChoice[]>([]);
  const [sizesCache, setSizesCache] = useState<Record<string, SizeOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([ordersData, settingsData]) => {
      const orders = ordersData.orders || [];
      const found = orders.find((o: { order_id?: string }) => String(o.order_id) === orderId);
      setOrder(found || null);
      setReturnReasons(settingsData.return_reasons || []);
      const items = (found?.items || found?.line_items || []) as LineItem[];
      setChoices(items.map((it) => ({ sku: it.sku || "", action: "return" as const, reason_id: "", selected_size_id: "" })));
    }).finally(() => setLoading(false));
  }, [orderId]);

  const fetchSizes = async (sku: string) => {
    if (sizesCache[sku]) return;
    const res = await fetch("/api/sizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) });
    const data = await res.json();
    setSizesCache((prev) => ({ ...prev, [sku]: data.sizes || [] }));
  };

  const setChoice = (index: number, update: Partial<ItemChoice>) => {
    setChoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const handleContinue = () => {
    setValidationError(null);
    const missingReason = choices.some((c, idx) => {
      const action = c.action ?? "return";
      return action === "return" && (c.reason_id == null || String(c.reason_id).trim() === "");
    });
    if (missingReason) {
      setValidationError("נא לבחור סיבת החזרה לכל פריט שמוחזר.");
      return;
    }
    setSending(true);
    const wizard = {
      orderId,
      order,
      choices,
      step: "items",
    };
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push(`/shipping?orderId=${encodeURIComponent(orderId)}`);
    setSending(false);
  };

  if (loading || !order) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  const items = (order.items || order.line_items || []) as LineItem[];
  if (items.length === 0) return <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>לא נמצאו פריטים.</p></div>;

  return (
    <div>
      {validationError && (
        <div className="msg-error" style={{ marginBottom: "var(--space-4)" }}>{validationError}</div>
      )}
      {items.map((item, i) => (
        <div key={i} className="card">
          <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-body)" }}><strong>{item.product_name || item.sku || "פריט"}</strong> {item.price != null && <span style={{ color: "var(--color-text-muted)" }}>— {item.price} ₪</span>}</p>
          <div className="input-wrap">
            <label className="input-label">החזרה או החלפה</label>
            <select
              className="input"
              value={choices[i]?.action || "return"}
              onChange={(e) => {
                const action = e.target.value as "return" | "replace";
                setChoice(i, { action, reason_id: undefined, selected_size_id: undefined });
                if (action === "replace") fetchSizes(item.sku || "");
              }}
            >
              <option value="return">החזרה</option>
              <option value="replace">החלפה</option>
            </select>
          </div>
          {choices[i]?.action === "return" && (
            <div className="input-wrap">
              <label className="input-label">סיבת ההחזרה <span style={{ color: "var(--color-error, #c00)" }}>*</span></label>
              <select
                className="input"
                value={choices[i].reason_id ?? ""}
                onChange={(e) => setChoice(i, { reason_id: e.target.value })}
                required
                aria-required="true"
              >
                <option value="">בחר סיבה</option>
                {returnReasons.map((r, j) => (
                  <option key={j} value={String(j)}>{r}</option>
                ))}
              </select>
            </div>
          )}
          {choices[i]?.action === "replace" && (
            <div className="input-wrap">
              <label className="input-label">גודל / אפשרות</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-start" }}>
                {(sizesCache[item.sku || ""] || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {(sizesCache[item.sku || ""] || []).map((s) => (
                      <label
                        key={s.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "var(--space-1)",
                          padding: "var(--space-2)",
                          border: choices[i]?.selected_size_id === s.id ? "2px solid var(--color-primary, #9b2d30)" : "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md, 6px)",
                          cursor: "pointer",
                          minWidth: 80,
                        }}
                      >
                        {s.image || (s.images && s.images.length > 0) ? (
                          <SizeImageGallery urls={s.images && s.images.length > 0 ? s.images : s.image ? [s.image] : []} />
                        ) : null}
                        <span style={{ fontSize: "var(--text-caption)" }}>{s.label || s.id}</span>
                        {s.price != null && <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{s.price} ₪</span>}
                        <input
                          type="radio"
                          name={`size-${i}-${item.sku}`}
                          value={s.id}
                          checked={choices[i]?.selected_size_id === s.id}
                          onChange={() => {
                            setChoice(i, {
                              selected_size_id: s.id,
                              size_label: s.label,
                              size_price: s.price,
                            });
                          }}
                          style={{ marginTop: "var(--space-1)" }}
                        />
                      </label>
                    ))}
                  </div>
                )}
                <select
                  className="input"
                  value={choices[i].selected_size_id ?? ""}
                  onChange={(e) => {
                    const opt = sizesCache[item.sku || ""]?.find((s) => s.id === e.target.value);
                    setChoice(i, {
                      selected_size_id: e.target.value,
                      size_label: opt?.label,
                      size_price: opt?.price,
                    });
                  }}
                  onFocus={() => fetchSizes(item.sku || "")}
                  style={{ minWidth: 160 }}
                >
                  <option value="">בחר גודל</option>
                  {(sizesCache[item.sku || ""] || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.label || s.id} {s.price != null ? `— ${s.price} ₪` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={sending}>
        {sending ? "שולח…" : "המשך למשלוח ואיסוף"}
      </button>
    </div>
  );
}
