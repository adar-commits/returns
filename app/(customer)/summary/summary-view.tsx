"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { sku: string; product_name?: string; partname?: string; price?: number; qty?: number };
type Choice = {
  sku: string;
  action: string;
  reason_id?: string;
  selected_size_id?: string;
  size_label?: string;
  size_price?: number;
};
type Wizard = {
  orderId: string;
  order: { items?: LineItem[]; line_items?: LineItem[] };
  choices: Choice[];
  shipping: { type: string; fee: number; branch_id?: string; branch?: { name?: string; address?: string; state?: string } };
};
type CustomerDetails = { name?: string; full_name?: string; address?: string; phone?: string };

type ItemRow = {
  sku: string;
  name: string;
  action: string;
  paidPrice: number;
  newPrice: number;
  diff: number; // positive = extra to pay; negative = refund
  sizeLabel?: string;
};

function fmt(n: number) {
  return n.toLocaleString("he-IL");
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--color-border)", margin: "var(--space-3) 0" }} />;
}

export default function SummaryView() {
  const router = useRouter();
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({});
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [refundTotal, setRefundTotal] = useState(0);
  const [payTotal, setPayTotal] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("returns_wizard");
    if (!raw) { router.push("/orders"); return; }
    const w = JSON.parse(raw) as Wizard;
    setWizard(w);
    setShippingFee(w.shipping?.fee ?? 0);

    const items: LineItem[] = w.order?.items || w.order?.line_items || [];
    let refund = 0;
    let pay = 0;
    const rows: ItemRow[] = [];

    for (const c of w.choices || []) {
      const item = items.find((i) => i.sku === c.sku);
      const paidPrice = Number(item?.price ?? 0);
      const name = item?.product_name || item?.partname || c.sku || "פריט";

      if (c.action === "return") {
        refund += paidPrice;
        rows.push({ sku: c.sku, name, action: "return", paidPrice, newPrice: 0, diff: -paidPrice });
      } else if (c.action === "replace") {
        const newPrice = Number(c.size_price ?? paidPrice);
        const diff = newPrice - paidPrice;
        if (diff > 0) pay += diff;
        else refund += -diff;
        rows.push({ sku: c.sku, name, action: "replace", paidPrice, newPrice, diff, sizeLabel: c.size_label });
      }
    }

    setItemRows(rows);
    setRefundTotal(refund);
    setPayTotal(pay);
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

  const netPay = Math.max(0, payTotal + shippingFee - refundTotal);
  const netRefund = Math.max(0, refundTotal - payTotal - shippingFee);
  const needsPayment = netPay > 0;
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
      if (!res.ok) { setError(data.error || "Failed to submit"); return; }
      if (data.payment_link) { window.location.href = data.payment_link; return; }
      sessionStorage.removeItem("returns_wizard");
      router.push(`/success?returnId=${encodeURIComponent(data.return_id || "")}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!wizard) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  const shippingLabel =
    wizard.shipping?.type === "branch"
      ? `איסוף עצמי — ${wizard.shipping.branch?.name ?? ""}${wizard.shipping.branch?.state ? `, ${wizard.shipping.branch.state}` : ""}`
      : "שליח עד הבית";

  return (
    <div>
      <p style={{ marginBottom: "var(--space-4)" }}>
        <a href="/shipping" className="link">חזרה →</a>
      </p>

      {/* ── Per-product breakdown ── */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <p style={{ fontWeight: 700, fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", letterSpacing: "0.04em" }}>
          הזמנה {wizard.orderId}
        </p>

        {itemRows.map((row, i) => (
          <div key={row.sku + i}>
            {i > 0 && <Divider />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
              {/* Right: product info */}
              <div style={{ flex: 1, minWidth: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>
                <p style={{ fontWeight: 600, fontSize: "var(--text-body)", marginBottom: 4 }}>{row.name}</p>
                {row.action === "return" && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>החזרה</p>
                )}
                {row.action === "replace" && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                    החלפה{row.sizeLabel ? ` → ${row.sizeLabel}` : ""}
                  </p>
                )}
                {row.paidPrice > 0 && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginTop: 2 }}>
                    מחיר ששולם: {fmt(row.paidPrice)} ₪
                    {row.action === "replace" && row.newPrice !== row.paidPrice && (
                      <> → <strong>{fmt(row.newPrice)} ₪</strong></>
                    )}
                  </p>
                )}
              </div>
              {/* Left: amount */}
              <div style={{ textAlign: "left", direction: "ltr", flexShrink: 0 }}>
                {row.action === "return" && row.paidPrice > 0 && (
                  <span style={{ color: "var(--color-success)", fontWeight: 700, fontSize: "var(--text-body)" }}>
                    −{fmt(row.paidPrice)} ₪
                  </span>
                )}
                {row.action === "replace" && row.diff !== 0 && (
                  <span
                    style={{
                      color: row.diff > 0 ? "var(--color-primary)" : "var(--color-success)",
                      fontWeight: 700,
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {row.diff > 0 ? "+" : "−"}{fmt(Math.abs(row.diff))} ₪
                  </span>
                )}
                {row.action === "replace" && row.diff === 0 && (
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-caption)" }}>ללא הפרש</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <Divider />

        {/* Shipping line */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>{shippingLabel}</span>
          <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, direction: "ltr" }}>
            {shippingFee > 0 ? `+${fmt(shippingFee)} ₪` : "חינם"}
          </span>
        </div>

        {/* Subtotals */}
        {refundTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            <span>סה״כ זיכויים</span>
            <span style={{ direction: "ltr" }}>−{fmt(refundTotal)} ₪</span>
          </div>
        )}
        {payTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            <span>סה״כ הפרשים</span>
            <span style={{ direction: "ltr" }}>+{fmt(payTotal)} ₪</span>
          </div>
        )}

        <Divider />

        {/* Net total */}
        {netPay > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "var(--text-subtitle)" }}>סה״כ לתשלום</strong>
            <strong style={{ fontSize: "var(--text-subtitle)", color: "var(--color-primary)", direction: "ltr" }}>
              {fmt(netPay)} ₪
            </strong>
          </div>
        )}
        {netRefund > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "var(--text-subtitle)" }}>זיכוי צפוי</strong>
            <strong style={{ fontSize: "var(--text-subtitle)", color: "var(--color-success)", direction: "ltr" }}>
              {fmt(netRefund)} ₪
            </strong>
          </div>
        )}
        {netPay === 0 && netRefund === 0 && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--text-caption)" }}>
            אין הפרש לתשלום
          </p>
        )}
        {netRefund > 0 && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
            הזיכוי יוחזר לאמצעי התשלום המקורי בכפוף לבדיקה
          </p>
        )}
      </div>

      {/* Delivery address form (only when payment + delivery) */}
      {needsAddress && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <p className="card-title">פרטי משלוח</p>
          <div className="input-wrap">
            <label className="input-label">שם מלא</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ישראל ישראלי"
              required
            />
          </div>
          <div className="input-wrap">
            <label className="input-label">טלפון</label>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-0000000"
              required
              dir="ltr"
            />
          </div>
          <div className="input-wrap">
            <label className="input-label">כתובת מלאה לאיסוף</label>
            <input
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="רחוב, מספר בית, עיר"
              required
            />
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
        {submitting ? "שולח…" : needsPayment ? "המשך לתשלום" : "סיום ושליחת בקשה"}
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
