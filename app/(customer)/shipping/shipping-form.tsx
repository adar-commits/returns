"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Branch = { id: string; name?: string; address?: string; phone?: string; opening_hours?: string; map_url?: string };
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setShippingTiers(d.shipping_tiers || []));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
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
    setLoading(false);
  }, [shippingTiers]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const handleContinue = () => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) return;
    const wizard = JSON.parse(raw);
    wizard.shipping = deliveryOrBranch === "delivery" ? { type: "delivery", fee: shippingFee } : { type: "branch", branch_id: selectedBranchId, branch: selectedBranch, fee: 0 };
    wizard.step = "shipping";
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push("/summary");
  };

  if (loading && shippingTiers.length === 0) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  return (
    <div>
      <p style={{ marginBottom: "var(--space-4)" }}><a href={`/orders/${orderId}/items`} className="link">← חזרה</a></p>
      <div className="choice-group" style={{ marginBottom: "var(--space-5)" }}>
        <label className="choice-option" data-selected={deliveryOrBranch === "delivery"} style={{ cursor: "pointer" }}>
          <input type="radio" name="shipping" checked={deliveryOrBranch === "delivery"} onChange={() => setDeliveryOrBranch("delivery")} />
          <div>
            <strong>שליח עד הבית</strong>
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}> — {shippingFee} ₪</span>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>מערך השליחים שלנו לשירותכם</p>
          </div>
        </label>
        <label className="choice-option" data-selected={deliveryOrBranch === "branch"} style={{ cursor: "pointer" }}>
          <input type="radio" name="shipping" checked={deliveryOrBranch === "branch"} onChange={() => setDeliveryOrBranch("branch")} />
          <div>
            <strong>החזרה לסניף / איסוף עצמי</strong>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}> — חינם</span>
          </div>
        </label>
      </div>
      {deliveryOrBranch === "branch" && (
        <div className="card" style={{ marginBottom: "var(--space-5)" }}>
          <p className="card-title" style={{ marginBottom: "var(--space-2)" }}>לאיזה סניף תרצו להגיע?</p>
          <div className="input-wrap">
            <select
              className="input"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">בחר סניף</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name || b.id}</option>
              ))}
            </select>
          </div>
          {selectedBranch && (
            <div style={{ marginTop: "var(--space-4)", fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
              {selectedBranch.address && <p>{selectedBranch.address}</p>}
              {selectedBranch.phone && <p>טלפון: {selectedBranch.phone}</p>}
              {selectedBranch.opening_hours && <p>שעות: {selectedBranch.opening_hours}</p>}
              {selectedBranch.map_url && <a href={selectedBranch.map_url} target="_blank" rel="noopener noreferrer" className="link">מפה (Waze)</a>}
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
