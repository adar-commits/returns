"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Wizard = {
  orderId: string;
  order: { items?: Array<{ sku: string; product_name?: string; price?: number }> };
  choices: Array<{ sku: string; action: string; reason_id?: string; selected_size_id?: string; size_price?: number }>;
  shipping: { type: string; fee: number; branch_id?: string; branch?: { name?: string } };
};
type CustomerDetails = { name?: string; full_name?: string; address?: string; phone?: string; city?: string; zip?: string };

export default function SummaryView() {
  const router = useRouter();
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({});
  const [refund, setRefund] = useState(0);
  const [toPay, setToPay] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) {
      router.push("/orders");
      return;
    }
    const w = JSON.parse(raw) as Wizard;
    setWizard(w);
    setShippingFee(w.shipping?.fee ?? 0);
    let refundTotal = 0;
    let payTotal = 0;
    const items = w.order?.items || [];
    for (const c of w.choices || []) {
      const item = items.find((i: { sku: string }) => i.sku === c.sku);
      const itemPrice = item?.price ?? 0;
      if (c.action === "return") {
        refundTotal += itemPrice;
      } else if (c.action === "replace" && c.size_price != null) {
        const diff = c.size_price - itemPrice;
        if (diff > 0) payTotal += diff;
        else refundTotal += -diff;
      }
    }
    setRefund(refundTotal);
    setToPay(payTotal);
  }, [router]);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const cd = d.customerDetails || d.customer_details || {};
        setCustomerDetails(cd);
        setFullName(cd.name || cd.full_name || "");
        setPhone(cd.phone || "");
        setAddress(cd.address || "");
      });
  }, []);

  const totalToPay = Math.max(0, toPay + shippingFee - refund);
  const totalRefund = Math.max(0, refund - toPay - (refund > toPay ? 0 : shippingFee));
  const needsPayment = totalToPay > 0;
  const needsAddress = needsPayment && wizard?.shipping?.type === "delivery";

  const handleSubmit = async () => {
    if (!wizard) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/return-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizard,
          customer_address: needsAddress ? { full_name: fullName, phone, address } : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }
      if (data.payment_link) {
        window.location.href = data.payment_link;
        return;
      }
      sessionStorage.removeItem("returns_wizard");
      router.push(`/success?returnId=${encodeURIComponent(data.return_id || "")}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!wizard) return <p>טוען…</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      <p><a href="/shipping" style={{ color: "#8B4513" }}>← חזרה</a></p>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginTop: 16 }}>
        <p>סיכום חיוב</p>
        {refund > 0 && <p>זיכוי: ₪{refund}</p>}
        {toPay > 0 && <p>הפרש לתשלום: ₪{toPay}</p>}
        {wizard.shipping?.fee > 0 && <p>עלות משלוח: ₪{wizard.shipping.fee}</p>}
        <p><strong>סה״כ לתשלום: ₪{totalToPay}</strong></p>
        {totalRefund > 0 && <p>הזיכוי יוחזר לאמצעי התשלום איתו שולמה ההזמנה בכפוף לבדיקה</p>}
      </div>
      {needsAddress && (
        <div style={{ marginTop: 24 }}>
          <p><strong>מילוי כתובת</strong></p>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="שם מלא" required={needsAddress} style={{ width: "100%", padding: 8, marginTop: 8 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון" required={needsAddress} style={{ width: "100%", padding: 8, marginTop: 8 }} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת" required={needsAddress} style={{ width: "100%", padding: 8, marginTop: 8 }} />
        </div>
      )}
      {error && <p style={{ color: "crimson", marginTop: 8 }}>{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || (needsAddress && (!fullName || !phone || !address))}
        style={{ marginTop: 24, padding: 12, width: "100%", backgroundColor: "#8B4513", color: "white", border: "none", borderRadius: 6 }}
      >
        {submitting ? "שולח…" : needsPayment ? "המשך לתשלום" : "סיום"}
      </button>
    </div>
  );
}
