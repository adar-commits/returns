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
type ItemChoice = { sku: string; action: "" | "return" | "replace"; reason_id?: string; selected_size_id?: string; size_label?: string; size_price?: number };
type SizeOption = { id: string; label?: string; price?: number; compare_at_price?: number; image?: string; images?: string[] };

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
      setChoices(items.map((it) => ({ sku: it.sku || "", action: "", reason_id: "", selected_size_id: "" })));
      // Trigger GetSizes immediately for all products in this order (so gallery is ready without waiting for "החלפה")
      items.forEach((it: LineItem) => {
        const sku = it.sku?.trim();
        if (!sku) return;
        fetch("/api/sizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) })
          .then((res) => res.json())
          .then((data) => setSizesCache((prev) => ({ ...prev, [sku]: data.sizes || [] })));
      });
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
    const hasUnselected = choices.some((c) => c.action === "" || c.action == null);
    if (hasUnselected) {
      setValidationError("נא לבחור לכל פריט: החלפה או החזרה.");
      return;
    }
    const missingReason = choices.some((c, idx) => {
      const action = c.action ?? "";
      return action === "return" && (c.reason_id == null || String(c.reason_id).trim() === "");
    });
    if (missingReason) {
      setValidationError("נא לבחור סיבת החזרה לכל פריט שמוחזר.");
      return;
    }
    const missingSize = choices.some((c) => {
      return c.action === "replace" && (c.selected_size_id == null || String(c.selected_size_id).trim() === "");
    });
    if (missingSize) {
      setValidationError("נא לבחור גודל לכל פריט שמוחלף.");
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
      {items.map((item, i) => {
        const sizes = sizesCache[item.sku || ""] || [];
        const productImages = sizes.length > 0 && (sizes[0].images?.length || sizes[0].image)
          ? (sizes[0].images && sizes[0].images.length > 0 ? sizes[0].images : sizes[0].image ? [sizes[0].image] : [])
          : [];
        const galleryLoading = sizes.length === 0 && item.sku;
        return (
        <div key={i} className="card" style={{ display: "flex", flexDirection: "row-reverse", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-body)" }}><strong>{item.product_name || item.sku || "פריט"}</strong></p>
            <div className="input-wrap">
              <label className="input-label">החזרה או החלפה</label>
              <select
                className="input"
                value={choices[i]?.action ?? ""}
                onChange={(e) => {
                  const action = (e.target.value || "") as "" | "return" | "replace";
                  setChoice(i, { action, reason_id: action !== "return" ? undefined : choices[i]?.reason_id, selected_size_id: action !== "replace" ? undefined : choices[i]?.selected_size_id });
                }}
              >
                <option value="">בחר פעולה</option>
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
                  {sizes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {sizes.map((s) => (
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
                          <span style={{ fontSize: "var(--text-caption)" }}>{s.label || s.id}</span>
                          <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                            {s.compare_at_price != null && <span style={{ textDecoration: "line-through", marginLeft: "var(--space-1)" }}>{s.compare_at_price} ₪</span>}
                            {s.price != null && <span style={{ marginRight: "var(--space-1)" }}> {s.price} ₪</span>}
                          </span>
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
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.label || s.id}{s.compare_at_price != null ? ` ${s.compare_at_price} ₪` : ""}{s.price != null ? ` — ${s.price} ₪` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: "0 0 auto", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {productImages.length > 0 ? (
              <SizeImageGallery urls={productImages} />
            ) : galleryLoading ? (
              <div className="skeleton" style={{ width: 96, height: 96, borderRadius: 6 }} aria-hidden />
            ) : null}
          </div>
        </div>
        );
      })}
      <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={sending}>
        {sending ? "שולח…" : "המשך למשלוח ואיסוף"}
      </button>
    </div>
  );
}
