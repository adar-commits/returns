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

  if (loading && shippingTiers.length === 0) return <p>טוען…</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      <p><a href={`/orders/${orderId}/items`} style={{ color: "#8B4513" }}>← חזרה</a></p>
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="radio" checked={deliveryOrBranch === "delivery"} onChange={() => setDeliveryOrBranch("delivery")} />
          <span>שליח עד הבית - {shippingFee} ₪</span>
        </label>
        <p style={{ fontSize: 14, color: "#666" }}>למה לטרוח? מערך השליחים שלנו לשירותכם</p>
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input type="radio" checked={deliveryOrBranch === "branch"} onChange={() => setDeliveryOrBranch("branch")} />
          <span>החזרה לסניף / איסוף עצמי - חינם</span>
        </label>
        {deliveryOrBranch === "branch" && (
          <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
            <p><strong>לאיזה סניף תרצו להגיע?</strong></p>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            >
              <option value="">בחר סניף</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name || b.id}</option>
              ))}
            </select>
            {selectedBranch && (
              <div style={{ marginTop: 12, fontSize: 14 }}>
                {selectedBranch.address && <p>{selectedBranch.address}</p>}
                {selectedBranch.phone && <p>טלפון: {selectedBranch.phone}</p>}
                {selectedBranch.opening_hours && <p>שעות: {selectedBranch.opening_hours}</p>}
                {selectedBranch.map_url && <a href={selectedBranch.map_url} target="_blank" rel="noopener noreferrer">מפה</a>}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleContinue}
        disabled={deliveryOrBranch === "branch" && !selectedBranchId}
        style={{ marginTop: 24, padding: 12, width: "100%", backgroundColor: "#8B4513", color: "white", border: "none", borderRadius: 6 }}
      >
        המשך לסיכום הזמנה
      </button>
    </div>
  );
}
