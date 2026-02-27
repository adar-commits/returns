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

export default function ShippingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shippingTiers, setShippingTiers] = useState<ShippingTier[]>([]);
  const [deliveryOrBranch, setDeliveryOrBranch] = useState<"delivery" | "branch">("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [shippingFee, setShippingFee] = useState(0);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .finally(() => setLoadingBranches(false));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setShippingTiers(d.shipping_tiers || []));
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
      if (total >= tier.min && total <= tier.max) {
        setShippingFee(tier.fee);
        break;
      }
    }
  }, [shippingTiers]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const handleContinue = () => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
    const wizard = JSON.parse(raw);
    wizard.shipping =
      deliveryOrBranch === "delivery"
        ? { type: "delivery", fee: shippingFee }
        : { type: "branch", branch_id: selectedBranchId, branch: selectedBranch, fee: 0 };
    wizard.step = "shipping";
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push("/summary");
  };

  return (
    <div>
      <p style={{ marginBottom: "var(--space-4)" }}>
        <a href={`/orders/${orderId}/items`} className="link">← חזרה</a>
      </p>

      {/* Shipping option: delivery */}
      <div className="choice-group" style={{ marginBottom: "var(--space-5)" }}>
        <label className="choice-option" data-selected={deliveryOrBranch === "delivery"} style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="shipping"
            checked={deliveryOrBranch === "delivery"}
            onChange={() => setDeliveryOrBranch("delivery")}
          />
          <div>
            <strong>שליח עד הבית</strong>
            {shippingFee > 0 && (
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}> — {shippingFee} ₪</span>
            )}
            {shippingFee === 0 && (
              <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
            )}
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              מערך השליחים שלנו יאסוף מהבית
            </p>
          </div>
        </label>

        {/* Shipping option: branch */}
        <label className="choice-option" data-selected={deliveryOrBranch === "branch"} style={{ cursor: "pointer" }}>
          <input
            type="radio"
            name="shipping"
            checked={deliveryOrBranch === "branch"}
            onChange={() => setDeliveryOrBranch("branch")}
          />
          <div>
            <strong>החזרה לסניף / איסוף עצמי</strong>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              הגיעו לאחד מסניפינו ללא עלות משלוח
            </p>
          </div>
        </label>
      </div>

      {/* Branch selection */}
      {deliveryOrBranch === "branch" && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <p style={{ fontWeight: 600, marginBottom: "var(--space-3)", fontSize: "var(--text-body)" }}>
            בחרו סניף:
          </p>
          {loadingBranches ? (
            <div className="loading-block" style={{ padding: "var(--space-6)" }}>
              <div className="loader" />
              <span>טוען סניפים…</span>
            </div>
          ) : branches.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-caption)" }}>לא נמצאו סניפים</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {branches.map((b) => {
                const selected = selectedBranchId === b.id;
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
                      border: selected
                        ? "2px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      background: selected ? "var(--color-primary-muted)" : "var(--color-surface-elevated)",
                      cursor: "pointer",
                      textAlign: "right",
                      width: "100%",
                      transition: "border-color 0.2s, background 0.2s",
                      boxShadow: selected ? "var(--shadow-focus)" : "var(--shadow-sm)",
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
                    {b.phone && (
                      <a
                        href={`tel:${b.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: "var(--text-caption)", color: "var(--color-primary)", textDecoration: "none", direction: "ltr" }}
                      >
                        {b.phone}
                      </a>
                    )}
                    {b.map_url && (
                      <a
                        href={b.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="link"
                        style={{ fontSize: "var(--text-small)" }}
                      >
                        מפה / Waze
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
