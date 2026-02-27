"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
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
  const [deliveryOrBranch, setDeliveryOrBranch] = useState<"delivery" | "branch">("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [shippingFee, setShippingFee] = useState(0);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
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

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw || shippingTiers.length === 0) return;
    const wizard = JSON.parse(raw);
    const choices = wizard.choices || [];
    let total = 0;
    for (const c of choices) {
      if (c.action === "return" && wizard.order?.items) {
        const item = wizard.order.items.find((i: { sku: string }) => i.sku === c.sku);
        if (item?.price) total += Number(item.price);
      }
      if (c.action === "replace" && c.size_price != null) total += Number(c.size_price);
    }
    for (const tier of shippingTiers) {
      if (total >= tier.min && total <= tier.max) { setShippingFee(tier.fee); break; }
    }
  }, [shippingTiers]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const doNavigate = () => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
    const wizard = JSON.parse(raw);
    wizard.shipping = deliveryOrBranch === "delivery"
      ? { type: "delivery", fee: shippingFee }
      : { type: "branch", branch_id: selectedBranchId, branch: selectedBranch, fee: 0 };
    wizard.step = "shipping";
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push("/summary");
  };

  const handleContinue = () => {
    if (deliveryOrBranch === "branch" && selectedBranchId) {
      setShowWarning(true);
    } else {
      doNavigate();
    }
  };

  return (
    <div>
      {showWarning && (
        <BranchWarningModal
          onConfirm={() => { setShowWarning(false); doNavigate(); }}
          onCancel={() => setShowWarning(false)}
        />
      )}

      <p style={{ marginBottom: "var(--space-4)" }}>
        <a href={`/orders/${orderId}/items`} className="link">חזרה →</a>
      </p>

      {/* Shipping option cards */}
      <div className="choice-group" style={{ marginBottom: "var(--space-5)" }}>
        <label className="choice-option" data-selected={deliveryOrBranch === "delivery"} style={{ cursor: "pointer" }}>
          <input type="radio" name="shipping" checked={deliveryOrBranch === "delivery"} onChange={() => setDeliveryOrBranch("delivery")} />
          <div>
            <strong>שליח עד הבית</strong>
            {shippingFee === 0
              ? <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
              : <span style={{ color: "var(--color-primary)", fontWeight: 600 }}> — ₪{shippingFee}</span>
            }
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              מערך השליחים שלנו יאסוף מהבית
            </p>
          </div>
        </label>

        <label className="choice-option" data-selected={deliveryOrBranch === "branch"} style={{ cursor: "pointer" }}>
          <input type="radio" name="shipping" checked={deliveryOrBranch === "branch"} onChange={() => setDeliveryOrBranch("branch")} />
          <div>
            <strong>החזרה לסניף / איסוף עצמי</strong>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              הגיעו לאחד מסניפינו ללא עלות משלוח
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
          ) : branches.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-caption)", textAlign: "right" }}>לא נמצאו סניפים</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
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
                      alignItems: "flex-end",
                      gap: "var(--space-1)",
                      padding: "var(--space-4)",
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
                    <strong style={{ fontSize: "var(--text-body)", color: "var(--color-text)" }}>
                      {b.name}
                    </strong>
                    {(b.address || b.state) && (
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                        {[b.address, b.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", marginTop: "var(--space-1)" }}>
                      {b.phone && (
                        <a
                          href={`tel:${b.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: "var(--text-caption)", color: "var(--color-primary)", textDecoration: "none", direction: "ltr", fontWeight: 500 }}
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
                            gap: 4,
                            fontSize: "var(--text-small)",
                            color: "#00bcd4",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <WazeIcon />
                          Waze
                        </a>
                      )}
                    </div>
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
        disabled={deliveryOrBranch === "branch" && !selectedBranchId}
      >
        המשך לסיכום הזמנה
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
