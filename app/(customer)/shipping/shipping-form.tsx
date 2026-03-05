"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { totalDeliveryFee } from "@/lib/delivery-fee";

type Branch = {
  id: string;
  name: string;
  address?: string;
  state?: string;
  phone?: string;
  email?: string;
  map_url?: string;
  opening_hours?: string;
};
type ShippingTier = { min: number; max: number; fee: number };

function WazeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Waze-style map pin body */}
      <path d="M24 4C15.163 4 8 11.163 8 20c0 7.3 4.8 14.7 13.2 20.6.48.34 1.12.34 1.6 0C31.2 34.7 40 27.3 40 20 40 11.163 32.837 4 24 4z" fill="#33CCFF"/>
      {/* Eyes */}
      <circle cx="19" cy="19" r="2.5" fill="#1a1a2e"/>
      <circle cx="29" cy="19" r="2.5" fill="#1a1a2e"/>
      {/* Smile */}
      <path d="M18 25c1.5 2.5 10.5 2.5 12 0" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      {/* Antenna */}
      <circle cx="31" cy="10" r="2.5" fill="#FF6B35"/>
      <line x1="29" y1="10" x2="27" y2="14" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function BranchWarningModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(44,37,32,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface-elevated)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          maxWidth: 440,
          width: "100%",
          boxShadow: "var(--shadow-lg)",
          textAlign: "right",
          direction: "rtl",
        }}
      >
        <p style={{ fontSize: "1.3rem", marginBottom: "var(--space-2)" }}>🕐 שימו לב</p>
        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text)", lineHeight: 1.7, marginBottom: "var(--space-5)" }}>
          במקרה של החזרה לסניף יש לתאם עד 24 שעות לפני הגעה בכדי להבטיח מלאי תקין להזמנה.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", flexDirection: "row-reverse" }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
            הבנתי, המשך
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [wazeUrls, setWazeUrls] = useState<Record<string, string>>({});
  const [deliveryOrBranch, setDeliveryOrBranch] = useState<"delivery" | "branch" | "callback">("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [shippingFee, setShippingFee] = useState(85);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchesLoadError, setBranchesLoadError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [submittingCallback, setSubmittingCallback] = useState(false);
  const [onlyCallback, setOnlyCallback] = useState(false);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
    try {
      const wizard = JSON.parse(raw);
      const choices = wizard.choices || [];
      if (choices.some((c: { action?: string }) => c.action === "unsure")) {
        setOnlyCallback(true);
        setDeliveryOrBranch("callback");
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) {
      setDeliveryFeeLoading(false);
      setShippingFee(85);
      return;
    }
    const wizard = JSON.parse(raw);
    const orderItems = wizard.order?.items || wizard.order?.line_items || [];
    const choices: Array<{ action?: string; sku?: string }> = wizard.choices || [];
    // Only products that user is returning or replacing count toward delivery fee
    const returnOrReplaceChoices = choices.filter(
      (c: { action?: string }) => c.action === "return" || c.action === "replace"
    );
    if (returnOrReplaceChoices.length === 0) {
      setDeliveryFeeLoading(false);
      setShippingFee(85);
      return;
    }
    const skus = Array.from(new Set(returnOrReplaceChoices.map((c: { sku?: string }) => String(c.sku ?? "").trim()).filter(Boolean)));
    if (skus.length === 0) {
      setDeliveryFeeLoading(false);
      setShippingFee(85);
      return;
    }
    fetch("/api/sizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Items: skus }),
    })
      .then((r) => r.json())
      .then((d) => {
        const labsCsqr: Record<string, number> = d.labsCsqr || {};
        const items = returnOrReplaceChoices.map((c: { sku?: string }) => {
          const sku = String(c.sku ?? "").trim();
          const orderItem = orderItems.find((i: { sku?: string }) => String(i.sku ?? "").trim() === sku) as { product_name?: string; partname?: string } | undefined;
          return {
            productName: String(orderItem?.product_name ?? orderItem?.partname ?? sku).trim(),
            labsCsqr: labsCsqr[sku] ?? null,
          };
        });
        const fee = totalDeliveryFee(items);
        setShippingFee(fee);
      })
      .catch(() => setShippingFee(85))
      .finally(() => setDeliveryFeeLoading(false));
  }, []);

  useEffect(() => {
    setBranchesLoadError(false);
    fetch("/api/branches")
      .then((r) => {
        if (!r.ok) setBranchesLoadError(true);
        return r.json();
      })
      .then((d) => setBranches(d.branches ?? []))
      .catch(() => setBranchesLoadError(true))
      .finally(() => setLoadingBranches(false));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setShippingTiers(d.shipping_tiers || []);
        // Extract per-branch waze URLs stored as waze_{branchId} in content_headlines
        const headlines: Record<string, string> = d.content_headlines || {};
        const waze: Record<string, string> = {};
        Object.entries(headlines).forEach(([k, v]) => {
          if (k.startsWith("waze_")) waze[k.slice(5)] = v;
        });
        setWazeUrls(waze);
      });
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const doNavigate = () => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
    const wizard = JSON.parse(raw);
    if (deliveryOrBranch === "delivery") {
      wizard.shipping = { type: "delivery", fee: shippingFee };
    } else if (deliveryOrBranch === "branch") {
      wizard.shipping = { type: "branch", branch_id: selectedBranchId, branch: selectedBranch, fee: 0 };
    } else {
      wizard.shipping = { type: "callback", fee: 0 };
    }
    wizard.step = "shipping";
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push("/summary");
  };

  const handleContinue = async () => {
    if (deliveryOrBranch === "branch" && selectedBranchId) {
      setShowWarning(true);
      return;
    }
    if (deliveryOrBranch === "callback") {
      const raw = sessionStorage.getItem("returns_wizard");
      if (!raw) return;
      const wizard = JSON.parse(raw);
      wizard.shipping = { type: "callback", fee: 0 };
      wizard.step = "shipping";
      setSubmittingCallback(true);
      try {
        const res = await fetch("/api/return-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wizard }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        sessionStorage.removeItem("returns_wizard");
        router.push(
          `/success?returnId=${encodeURIComponent(data.return_id || "")}&shippingType=callback&branchName=`
        );
      } finally {
        setSubmittingCallback(false);
      }
      return;
    }
    doNavigate();
  };

  return (
    <div>
      {showWarning && (
        <BranchWarningModal
          onConfirm={() => { setShowWarning(false); doNavigate(); }}
          onCancel={() => setShowWarning(false)}
        />
      )}

      {/* Shipping option cards — when any product is "איני בטוח/ה" show only נציג טלפוני */}
      <div className="choice-group" style={{ marginBottom: "var(--space-5)" }}>
        {!onlyCallback && (
          <>
            <label className="choice-option" data-selected={deliveryOrBranch === "delivery"} style={{ cursor: "pointer" }}>
              <input type="radio" name="shipping" checked={deliveryOrBranch === "delivery"} onChange={() => setDeliveryOrBranch("delivery")} />
              <div>
                <strong>שליח עד הבית</strong>
                <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  — {deliveryFeeLoading ? "טוען…" : `₪${Number(shippingFee).toFixed(2)}`}
                </span>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                  מערך השליחים שלנו יאסוף את המוצר מביתכם
                </p>
              </div>
            </label>

            <label className="choice-option" data-selected={deliveryOrBranch === "branch"} style={{ cursor: "pointer" }}>
              <input type="radio" name="shipping" checked={deliveryOrBranch === "branch"} onChange={() => setDeliveryOrBranch("branch")} />
              <div>
                <strong>החזרה / החלפה בכל סניף</strong>
                <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
                <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                  החזירו את המוצר לאחד מסניפי הרשת שלנו ללא עלות
                </p>
              </div>
            </label>
          </>
        )}

        <label className="choice-option" data-selected={deliveryOrBranch === "callback"} style={{ cursor: onlyCallback ? "default" : "pointer" }}>
          <input type="radio" name="shipping" checked={deliveryOrBranch === "callback"} onChange={() => !onlyCallback && setDeliveryOrBranch("callback")} disabled={onlyCallback} />
          <div>
            <strong>נציג טלפוני</strong>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              {onlyCallback ? "נבחר אופן זה כי בחרת איני בטוח/ה באחד מהפריטים — יועצ/ת יחזור אליך בהקדם" : "חזרו אלי בטלפון — יועצ/ת עיצוב לשירותך ללא עלות, מענה עד 24 שעות"}
            </p>
          </div>
        </label>
      </div>

      {/* Branch list */}
      {deliveryOrBranch === "branch" && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <p style={{ fontWeight: 600, marginBottom: "var(--space-3)", fontSize: "var(--text-body)", textAlign: "right" }}>
            בחרו סניף:
          </p>
          {loadingBranches ? (
            <div className="loading-block" style={{ padding: "var(--space-6)" }}>
              <div className="loader" /><span>טוען סניפים…</span>
            </div>
          ) : branchesLoadError ? (
            <p style={{ color: "var(--color-error, #b91c1c)", fontSize: "var(--text-caption)", textAlign: "right" }}>שגיאה בטעינת הסניפים. נסו לרענן את הדף.</p>
          ) : branches.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-caption)", textAlign: "right" }}>לא נמצאו סניפים</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
              {branches.map((b) => {
                const selected = selectedBranchId === b.id;
                const wazeHref = wazeUrls[b.id] || b.map_url || null;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranchId(b.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      /* In RTL flex-column, flex-start = right side */
                      alignItems: "flex-start",
                      gap: "var(--space-1)",
                      padding: "var(--space-3)",
                      border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      background: selected ? "#f5f0e8" : "var(--color-surface-elevated)",
                      cursor: "pointer",
                      textAlign: "right",
                      width: "100%",
                      direction: "rtl",
                      transition: "border-color 0.2s, background 0.2s",
                      boxShadow: selected ? "0 0 0 3px rgba(155,45,48,0.10)" : "var(--shadow-sm)",
                    }}
                  >
                    <strong style={{ fontSize: "var(--text-caption)", color: "var(--color-text)", lineHeight: 1.3, display: "block", width: "100%", textAlign: "right" }}>
                      {b.name}
                    </strong>
                    {(b.address || b.state) && (
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", lineHeight: 1.3, textAlign: "right", display: "block", width: "100%" }}>
                        {[b.address, b.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {b.phone && (
                      <a
                        href={`tel:${b.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: "0.7rem", color: "var(--color-primary)", textDecoration: "none", direction: "ltr", fontWeight: 500, marginTop: 2, display: "block", width: "100%", textAlign: "right" }}
                      >
                        {b.phone}
                      </a>
                    )}
                    {wazeHref && (
                      <a
                        href={wazeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: "0.7rem",
                          color: "#00bcd4",
                          fontWeight: 600,
                          textDecoration: "none",
                          marginTop: 2,
                          width: "100%",
                          justifyContent: "flex-end",
                        }}
                      >
                        <WazeIcon />
                        Waze
                      </a>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleContinue}
        disabled={(deliveryOrBranch === "branch" && !selectedBranchId) || submittingCallback}
      >
        {submittingCallback ? "שולח…" : deliveryOrBranch === "callback" ? "שליחה ובקשה להחזרה טלפונית" : "המשך לסיכום הזמנה"}
      </button>
    </div>
  );
}
