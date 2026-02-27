"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GALLERY_SIZE = 160;
const MAX_GALLERY_IMAGES = 3;
const SIZE_GUIDE_URL =
  "https://www.carpetshop.co.il/cdn/shop/files/15_68460313-b64d-4af8-ae1d-2f7262a57abd.webp?v=1762080406";

function SizeImageGallery({ urls }: { urls: string[] }) {
  const limited = urls.slice(0, MAX_GALLERY_IMAGES);
  const [index, setIndex] = useState(0);
  const n = limited.length;
  useEffect(() => setIndex(0), [n]);
  if (n === 0) return null;
  if (n === 1)
    return (
      <img
        src={limited[0]}
        alt=""
        style={{ width: GALLERY_SIZE, height: GALLERY_SIZE, objectFit: "cover", borderRadius: 6 }}
        loading="eager"
      />
    );
  const prev = () => setIndex((i) => (i - 1 + n) % n);
  const next = () => setIndex((i) => (i + 1) % n);
  const btnStyle: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 44, height: 44, borderRadius: "50%",
    border: "1px solid var(--color-border)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer", fontSize: 20,
    display: "flex", alignItems: "center", justifyContent: "center",
    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  };
  return (
    <div style={{ position: "relative", width: GALLERY_SIZE, height: GALLERY_SIZE }}>
      <img
        src={limited[index]}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
        loading="eager"
      />
      <button type="button" aria-label="Previous" onClick={prev} style={{ ...btnStyle, left: 4 }}>‹</button>
      <button type="button" aria-label="Next" onClick={next} style={{ ...btnStyle, right: 4 }}>›</button>
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, alignItems: "center" }}>
        {limited.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Image ${i + 1}`}
            onClick={() => setIndex(i)}
            style={{
              border: "none", cursor: "pointer", padding: 0,
              minWidth: 28, minHeight: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              touchAction: "manipulation",
            }}
          >
            <span style={{
              display: "block",
              width: i === index ? 10 : 7, height: i === index ? 10 : 7,
              borderRadius: "50%",
              background: i === index ? "var(--color-primary)" : "rgba(255,255,255,0.75)",
              transition: "width 0.15s, height 0.15s",
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg, 12px)",
          maxWidth: "90vw", maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 8px 48px rgba(0,0,0,0.4)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "sticky", top: 8, float: "left",
            margin: "8px",
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "rgba(0,0,0,0.5)",
            color: "#fff", cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="סגור"
        >
          ✕
        </button>
        <img
          src={SIZE_GUIDE_URL}
          alt="מדריך מידות"
          style={{ display: "block", maxWidth: "100%", maxHeight: "85vh", objectFit: "contain" }}
        />
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
  const [sizesLoading, setSizesLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

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
      const seen = new Set<string>();
      const skus: string[] = [];
      for (const it of items) {
        const s = it.sku?.trim();
        if (s && !seen.has(s)) { seen.add(s); skus.push(s); }
      }
      if (skus.length > 0) {
        skus.forEach((s) => setSizesLoading((prev) => ({ ...prev, [s]: true })));
        fetch("/api/sizes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Items: skus }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) return;
            const results: Record<string, SizeOption[]> = data.results || {};
            setSizesCache((prev) => ({ ...prev, ...results }));
          })
          .catch(() => {})
          .finally(() => skus.forEach((s) => setSizesLoading((prev) => ({ ...prev, [s]: false }))));
      }
    }).finally(() => setLoading(false));
  }, [orderId]);

  const setChoice = (index: number, update: Partial<ItemChoice>) => {
    setChoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const handleContinue = () => {
    setValidationError(null);
    if (choices.some((c) => c.action === "" || c.action == null)) {
      setValidationError("נא לבחור לכל פריט: החלפה או החזרה.");
      return;
    }
    if (choices.some((c) => c.action === "return" && (c.reason_id == null || String(c.reason_id).trim() === ""))) {
      setValidationError("נא לבחור סיבת החזרה לכל פריט שמוחזר.");
      return;
    }
    if (choices.some((c) => c.action === "replace" && (c.selected_size_id == null || String(c.selected_size_id).trim() === ""))) {
      setValidationError("נא לבחור גודל לכל פריט שמוחלף.");
      return;
    }
    setSending(true);
    sessionStorage.setItem("returns_wizard", JSON.stringify({ orderId, order, choices, step: "items" }));
    router.push(`/shipping?orderId=${encodeURIComponent(orderId)}`);
    setSending(false);
  };

  if (loading || !order) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  const items = (order.items || order.line_items || []) as LineItem[];
  if (items.length === 0) return <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>לא נמצאו פריטים.</p></div>;

  return (
    <div>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}

      {validationError && (
        <div className="msg-error" style={{ marginBottom: "var(--space-4)" }}>{validationError}</div>
      )}

      {items.map((item, i) => {
        const sizes = sizesCache[item.sku || ""] || [];
        const productImages = sizes.length > 0
          ? (sizes[0].images && sizes[0].images.length > 0 ? sizes[0].images : sizes[0].image ? [sizes[0].image] : [])
          : [];
        const galleryLoading = sizes.length === 0 && !!item.sku && sizesLoading[item.sku || ""];

        return (
          <div key={i} className="card item-card">
            <div className="item-card-gallery">
              {productImages.length > 0 ? (
                <SizeImageGallery urls={productImages} />
              ) : galleryLoading ? (
                <div className="skeleton" style={{ width: GALLERY_SIZE, height: GALLERY_SIZE, borderRadius: 6 }} aria-hidden />
              ) : null}
            </div>

            <div className="item-card-content">
              <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-body)" }}>
                <strong>{item.product_name || item.sku || "פריט"}</strong>
              </p>

              {/* Action selector */}
              <div className="input-wrap">
                <label className="input-label">החזרה או החלפה</label>
                <select
                  className="input"
                  value={choices[i]?.action ?? ""}
                  onChange={(e) => {
                    const action = (e.target.value || "") as "" | "return" | "replace";
                    setChoice(i, {
                      action,
                      reason_id: action !== "return" ? undefined : choices[i]?.reason_id,
                      selected_size_id: action !== "replace" ? undefined : choices[i]?.selected_size_id,
                    });
                  }}
                >
                  <option value="">בחר פעולה</option>
                  <option value="return">החזרה</option>
                  <option value="replace">החלפה</option>
                </select>
              </div>

              {/* Return reason */}
              {choices[i]?.action === "return" && (
                <div className="input-wrap">
                  <label className="input-label">
                    סיבת ההחזרה <span style={{ color: "var(--color-error, #c00)" }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={choices[i].reason_id ?? ""}
                    onChange={(e) => setChoice(i, { reason_id: e.target.value })}
                    required
                  >
                    <option value="">בחר סיבה</option>
                    {returnReasons.map((r, j) => (
                      <option key={j} value={String(j)}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Replace — size picker (boxes only, no dropdown) */}
              {choices[i]?.action === "replace" && (
                <div className="input-wrap">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                    <label className="input-label" style={{ margin: 0 }}>בחר מידה חלופית</label>
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      style={{
                        background: "none", border: "none", padding: 0,
                        fontSize: "var(--text-small)",
                        color: "var(--color-primary, #9b2d30)",
                        cursor: "pointer", textDecoration: "underline",
                      }}
                    >
                      מדריך מידות
                    </button>
                  </div>

                  {sizesLoading[item.sku || ""] && sizes.length === 0 && (
                    <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>טוען אפשרויות…</p>
                  )}

                  {sizes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {sizes.map((s) => {
                        const selected = choices[i]?.selected_size_id === s.id;
                        return (
                          <label
                            key={s.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                              padding: "var(--space-2) var(--space-3)",
                              border: selected
                                ? "2px solid var(--color-primary, #9b2d30)"
                                : "1px solid var(--color-border)",
                              borderRadius: "var(--radius-md, 8px)",
                              cursor: "pointer",
                              minWidth: 88,
                              background: selected ? "rgba(155,45,48,0.06)" : "var(--color-surface)",
                              transition: "border-color 0.15s, background 0.15s",
                            }}
                          >
                            <span style={{ fontSize: "var(--text-body)", fontWeight: 600, color: "var(--color-text)" }}>
                              {s.label || s.id}
                            </span>

                            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                              {s.compare_at_price != null && (
                                <span style={{ fontSize: "var(--text-small)", color: "var(--color-primary, #9b2d30)", textDecoration: "line-through", opacity: 0.7 }}>
                                  ₪{s.compare_at_price}
                                </span>
                              )}
                              {s.price != null && (
                                <span style={{ fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--color-primary, #9b2d30)" }}>
                                  ₪{s.price}
                                </span>
                              )}
                            </span>

                            <input
                              type="radio"
                              name={`size-${i}-${item.sku}`}
                              value={s.id}
                              checked={selected}
                              onChange={() => setChoice(i, { selected_size_id: s.id, size_label: s.label, size_price: s.price })}
                              style={{ accentColor: "var(--color-primary, #9b2d30)", marginTop: 2 }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={sending}>
        {sending ? "שולח…" : "המשך למשלוח ואיסוף"}
      </button>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: "var(--space-2)", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}
        onClick={() => {
          sessionStorage.removeItem("returns_wizard");
          router.push("/orders");
          router.refresh();
        }}
      >
        Reset (QA)
      </button>
    </div>
  );
}
