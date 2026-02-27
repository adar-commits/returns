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

  if (!wizard) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  return (
    <div>
      <p style={{ marginBottom: "var(--space-4)" }}><a href="/shipping" className="link">← חזרה</a></p>
      <div className="card">
        <p className="card-title">סיכום חיוב</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-body)" }}>
          {refund > 0 && <p>זיכוי: <strong>₪{refund}</strong></p>}
          {toPay > 0 && <p>הפרש לתשלום: <strong>₪{toPay}</strong></p>}
          {wizard.shipping?.fee > 0 && <p>עלות משלוח: <strong>₪{wizard.shipping.fee}</strong></p>}
          <p style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border)", fontSize: "var(--text-subtitle)" }}>
            <strong>סה״כ לתשלום: ₪{totalToPay}</strong>
          </p>
          {totalRefund > 0 && <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>הזיכוי יוחזר לאמצעי התשלום בכפוף לבדיקה</p>}
        </div>
      </div>
      {needsAddress && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <p className="card-title">פרטי משלוח</p>
          <div className="input-wrap">
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="שם מלא" required={needsAddress} />
          </div>
          <div className="input-wrap">
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון" required={needsAddress} dir="ltr" />
          </div>
          <div className="input-wrap">
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת מלאה" required={needsAddress} />
          </div>
        </div>
      )}
      {error && <div className="msg-error">{error}</div>}
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting || (needsAddress && (!fullName || !phone || !address))}
      >
        {submitting ? "שולח…" : needsPayment ? "המשך לתשלום" : "סיום"}
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
