"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_RESTRICTED_SKUS } from "@/lib/constants";

const GALLERY_SIZE = 160;
const SIZE_GUIDE_URL =
  "https://www.carpetshop.co.il/cdn/shop/files/15_68460313-b64d-4af8-ae1d-2f7262a57abd.webp?v=1762080406";

function NoImagePlaceholder() {
  return (
    <div
      style={{
        width: GALLERY_SIZE,
        height: GALLERY_SIZE,
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "var(--color-text-muted)",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span style={{ fontSize: "0.7rem", textAlign: "center", lineHeight: 1.3, padding: "0 6px" }}>אין תמונה זמינה</span>
    </div>
  );
}

/** Single product image (no carousel) to avoid iOS gallery bugs. */
function SizeImageGallery({ urls }: { urls: string[] }) {
  const src = urls[0];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      style={{ width: GALLERY_SIZE, height: GALLERY_SIZE, objectFit: "cover", borderRadius: 8 }}
      loading="eager"
    />
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

type LineItem = { sku: string; product_name?: string; price?: number; qty?: number | string; [key: string]: unknown };
type ExpandedLineItem = LineItem & { _lineIdx: number; _qtyIdx: number; _totalQty: number };
type ItemChoice = { sku: string; action: "" | "return" | "replace" | "keep" | "unsure"; reason_id?: string; reason_text?: string; selected_size_id?: string; size_label?: string; size_price?: number };
type SizeOption = { id: string; label?: string; price?: number; compare_at_price?: number; image?: string; images?: string[] };

function expandByQty(items: LineItem[]): ExpandedLineItem[] {
  return items.flatMap((item, lineIdx) => {
    const qty = Math.max(1, Math.round(Number(item.qty) || 1));
    return Array.from({ length: qty }, (_, qtyIdx) => ({
      ...item,
      qty: 1,
      _lineIdx: lineIdx,
      _qtyIdx: qtyIdx,
      _totalQty: qty,
    }));
  });
}

/** Resolve sizes from cache — exact sku first, then prefix/suffix, then same product code (e.g. 31503138-200290 → 31503138-80150) */
function getSizesForSku(sku: string, cache: Record<string, SizeOption[]>): SizeOption[] {
  const s = (sku || "").trim();
  if (!s) return [];
  if (cache[s]?.length) return cache[s];
  const keys = Object.keys(cache);
  let match = keys.find((k) => k.startsWith(s + "-") || s.startsWith(k + "-") || k.startsWith(s) || s.startsWith(k));
  if (match) return cache[match] ?? [];
  // Same product, different size variant: e.g. order has 31503138-200290, webhook returned 31503138-80150
  const productCode = s.split("-")[0];
  if (productCode) match = keys.find((k) => k.split("-")[0] === productCode);
  return match ? (cache[match] ?? []) : [];
}

/** Normalize size string for comparison: "200*290", "200290", "200x290" → "200290" */
function normalizeSizeKey(str: string): string {
  return (str || "").replace(/[\s*×xX]/g, "").toLowerCase();
}

/** True if this size option is the same size as the current item (by SKU); do not allow replace-with-same */
function isSameSizeAsItem(itemSku: string, sizeOption: SizeOption): boolean {
  const skuPart = itemSku.split("-").slice(1).join("-").trim();
  if (!skuPart) return false;
  const itemKey = normalizeSizeKey(skuPart);
  const labelPart = (sizeOption.label ?? sizeOption.id ?? "").split(/\s*-\s*/)[0].trim();
  const sizeKey = normalizeSizeKey(labelPart);
  return sizeKey.length > 0 && itemKey === sizeKey;
}

export default function ItemSelection({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<{ items?: LineItem[]; [key: string]: unknown } | null>(null);
  const [expandedItems, setExpandedItems] = useState<ExpandedLineItem[]>([]);
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [restrictedSkus, setRestrictedSkus] = useState<string[]>([]);
  const [choices, setChoices] = useState<ItemChoice[]>([]);
  const [sizesCache, setSizesCache] = useState<Record<string, SizeOption[]>>({});
  const [sizesLoading, setSizesLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
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
      const fromSettings = Array.isArray(settingsData.restricted_skus) ? settingsData.restricted_skus : [];
      setRestrictedSkus(fromSettings);
      const rawItems = (found?.items || found?.line_items || []) as LineItem[];
      const restrictedSet = new Set(
        [...DEFAULT_RESTRICTED_SKUS, ...fromSettings].map((s: string) => String(s).trim())
      );
      const filteredRawItems = rawItems.filter((it) => !restrictedSet.has(String(it.sku || "").trim()));
      const exp = expandByQty(filteredRawItems);
      setExpandedItems(exp);
      setChoices(exp.map((it) => ({ sku: it.sku || "", action: "", reason_id: "", selected_size_id: "" })));
      const seen = new Set<string>();
      const skus: string[] = [];
      for (const it of filteredRawItems) {
        const s = String(it.sku || "").trim();
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
            // Map results to requested SKUs: exact key, or by product code (e.g. webhook returns 31503138-80150, we requested 31503138-200290)
            const toMerge: Record<string, SizeOption[]> = { ...results };
            const resultKeys = Object.keys(results);
            for (const reqSku of skus) {
              if (toMerge[reqSku]?.length) continue;
              const productCode = reqSku.split("-")[0];
              const match = resultKeys.find((k) => k.split("-")[0] === productCode);
              if (match && results[match]?.length) toMerge[reqSku] = results[match];
            }
            setSizesCache((prev) => ({ ...prev, ...toMerge }));
          })
          .catch(() => {})
          .finally(() => skus.forEach((s) => setSizesLoading((prev) => ({ ...prev, [s]: false }))));
      }
    }).finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (validationError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [validationError]);

  // Clear replacement selection when it points to same-size option (same SKU)
  useEffect(() => {
    if (expandedItems.length === 0 || Object.keys(sizesCache).length === 0) return;
    let changed = false;
    const next = [...choices];
    for (let i = 0; i < expandedItems.length; i++) {
      if (next[i]?.action !== "replace" || !next[i].selected_size_id) continue;
      const sizes = getSizesForSku(expandedItems[i].sku || "", sizesCache);
      const opt = sizes.find((s) => s.id === next[i].selected_size_id);
      if (opt && isSameSizeAsItem(expandedItems[i].sku || "", opt)) {
        next[i] = { ...next[i], selected_size_id: "", size_label: undefined, size_price: undefined };
        changed = true;
      }
    }
    if (changed) setChoices(next);
  }, [sizesCache, expandedItems, choices]);

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
      setValidationError("נא לבחור לכל פריט: החזרת מוצר, החלפת מידה, איני בטוח/ה עדיין או ללא שינוי.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (choices.some((c) => c.action === "return" && (c.reason_id == null || String(c.reason_id).trim() === ""))) {
      setValidationError("נא לבחור סיבת החזרה לכל פריט שמוחזר.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const otherReasonIndex = returnReasons.findIndex((r) => r === "אחר");
    if (otherReasonIndex >= 0 && choices.some((c) => c.action === "return" && String(c.reason_id) === String(otherReasonIndex) && (!c.reason_text || !String(c.reason_text).trim()))) {
      setValidationError("נא למלא את סיבת ההחזרה עבור \"אחר\".");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (choices.some((c) => c.action === "replace" && (c.selected_size_id == null || String(c.selected_size_id).trim() === ""))) {
      setValidationError("נא לבחור גודל לכל פריט שמוחלף.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Do not allow replace with same item (same SKU/size)
    for (let idx = 0; idx < expandedItems.length; idx++) {
      if (choices[idx]?.action !== "replace" || !choices[idx].selected_size_id) continue;
      const it = expandedItems[idx];
      const sz = getSizesForSku(it.sku || "", sizesCache).find((s) => s.id === choices[idx].selected_size_id);
      if (sz && isSameSizeAsItem(it.sku || "", sz)) {
        setValidationError("לא ניתן להחליף לאותו מוצר/מידה. נא לבחור מידה אחרת.");
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    setSending(true);
    sessionStorage.setItem("returns_wizard", JSON.stringify({ orderId, order, choices, step: "items" }));
    router.push(`/shipping?orderId=${encodeURIComponent(orderId)}`);
    setSending(false);
  };

  if (loading || !order) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  if (expandedItems.length === 0) return <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>לא נמצאו פריטים.</p></div>;

  return (
    <div>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}

      {validationError && (
        <div ref={errorRef} className="msg-error" style={{ marginBottom: "var(--space-4)" }}>{validationError}</div>
      )}

      {expandedItems.map((item, i) => {
        const sizes = getSizesForSku(item.sku || "", sizesCache);
        const productImages = sizes.length > 0
          ? (sizes[0].images && sizes[0].images.length > 0 ? sizes[0].images : sizes[0].image ? [sizes[0].image] : [])
          : [];
        const anyLoading = Object.values(sizesLoading).some(Boolean);
        const galleryLoading = sizes.length === 0 && !!item.sku && (sizesLoading[item.sku || ""] || anyLoading);

        return (
          <div key={i} className="card item-card">
            <div className="item-card-gallery">
              {productImages.length > 0 ? (
                <SizeImageGallery urls={productImages} />
              ) : galleryLoading ? (
                <div className="skeleton" style={{ width: GALLERY_SIZE, height: GALLERY_SIZE, borderRadius: 6 }} aria-hidden />
              ) : (
                <NoImagePlaceholder />
              )}
            </div>

            <div className="item-card-content">
              <div style={{ marginBottom: "var(--space-3)" }}>
                <p style={{ fontSize: "var(--text-body)", marginBottom: 2 }}>
                  <strong>{item.product_name || item.sku || "פריט"}</strong>
                  {item._totalQty > 1 && (
                  <span style={{
                    marginRight: "var(--space-2)",
                    fontSize: "var(--text-small)",
                    fontWeight: 400,
                    color: "var(--color-text-muted)",
                    background: "var(--color-border)",
                    borderRadius: "var(--radius-full)",
                    padding: "1px 8px",
                  }}>
                    יח׳ {item._qtyIdx + 1} מתוך {item._totalQty}
                  </span>
                )}
                </p>
                {item.price != null && Number(item.price) > 0 && (
                  <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    מחיר ששולם: <strong style={{ color: "var(--color-text)" }}>₪{Number(item.price).toLocaleString("he-IL")}</strong>
                  </p>
                )}
              </div>

              {/* Action selector */}
              <div className="input-wrap">
                <label className="input-label">החזרה או החלפה</label>
                <select
                  className="input"
                  value={choices[i]?.action ?? ""}
                  onChange={(e) => {
                    const action = (e.target.value || "") as "" | "return" | "replace" | "keep" | "unsure";
                    setChoice(i, {
                      action,
                      reason_id: action !== "return" ? undefined : choices[i]?.reason_id,
                      selected_size_id: action !== "replace" ? undefined : choices[i]?.selected_size_id,
                    });
                  }}
                >
                  <option value="">בחר פעולה</option>
                  <option value="return">החזרת מוצר</option>
                  <option value="replace">החלפת מידה</option>
                  <option value="unsure">איני בטוח/ה עדיין</option>
                  <option value="keep">ללא שינוי</option>
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
                    onChange={(e) => {
                    const val = e.target.value;
                    const isOther = returnReasons[Number(val)] === "אחר";
                    setChoice(i, { reason_id: val, reason_text: isOther ? (choices[i]?.reason_text ?? "") : undefined });
                  }}
                    required
                  >
                    <option value="">בחר סיבה</option>
                    {returnReasons.map((r, j) => (
                      <option key={j} value={String(j)}>{r}</option>
                    ))}
                  </select>
                  {returnReasons[Number(choices[i]?.reason_id)] === "אחר" && (
                    <div className="input-wrap" style={{ marginTop: "var(--space-2)" }}>
                      <label className="input-label">
                        פרט/י את הסיבה <span style={{ color: "var(--color-error, #c00)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={choices[i]?.reason_text ?? ""}
                        onChange={(e) => setChoice(i, { reason_text: e.target.value })}
                        placeholder="סיבת ההחזרה"
                        required
                      />
                    </div>
                  )}
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

                  {!sizesLoading[item.sku || ""] && sizes.length === 0 && (
                    <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      לא נמצאו מידות אחרות במלאי
                    </p>
                  )}

                  {sizes.length > 0 && (() => {
                    const replacementSizes = sizes.filter((s) => !isSameSizeAsItem(item.sku || "", s));
                    if (replacementSizes.length === 0) {
                      return (
                        <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                          לא נמצאו מידות אחרות במלאי
                        </p>
                      );
                    }
                    return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {replacementSizes.map((s) => {
                        const selected = choices[i]?.selected_size_id === s.id;
                        const origPrice = Number(item.price ?? 0);
                        const sizePrice = s.price != null ? Number(s.price) : null;
                        const diff = sizePrice != null && origPrice > 0 ? sizePrice - origPrice : null;
                        return (
                          <label
                            key={s.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 4,
                              padding: "var(--space-2) var(--space-3)",
                              border: selected
                                ? "2px solid var(--color-primary, #9b2d30)"
                                : "1px solid var(--color-border)",
                              borderRadius: "var(--radius-md, 8px)",
                              cursor: "pointer",
                              width: 100,
                              minHeight: 132,
                              boxSizing: "border-box",
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
                              {sizePrice != null && (
                                <span style={{ fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--color-primary, #9b2d30)" }}>
                                  ₪{sizePrice}
                                </span>
                              )}
                            </span>

                            {diff != null && diff !== 0 && (
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: diff > 0 ? "var(--color-primary, #9b2d30)" : "var(--color-success, #166534)",
                                textAlign: "center",
                                lineHeight: 1.2,
                              }}>
                                {diff > 0 ? `תוספת: ₪${diff}` : `זיכוי: ₪${Math.abs(diff)}`}
                              </span>
                            )}

                            <input
                              type="radio"
                              name={`size-${i}-${item.sku}-${item._lineIdx}-${item._qtyIdx}`}
                              value={s.id}
                              checked={selected}
                              onChange={() => setChoice(i, { selected_size_id: s.id, size_label: s.label, size_price: s.price })}
                              style={{ accentColor: "var(--color-primary, #9b2d30)", marginTop: 2 }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              )}
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
