"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { computeCheckoutTotals } from "@/lib/coupon";

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
  shipping: { type: string; fee: number; branch_id?: string; branch?: { id?: string; name?: string; address?: string; state?: string; phone?: string; opening_hours?: string; map_url?: string } };
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
  return formatMoney(n);
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [termsPortalUrl, setTermsPortalUrl] = useState<string>("https://www.carpetshop.co.il/policies/terms-of-service");
  const [termsShippingUrl, setTermsShippingUrl] = useState<string>("https://www.carpetshop.co.il/policies/refund-policy");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponFieldError, setCouponFieldError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (termsError) termsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error, termsError]);

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
      } else if (c.action === "keep") {
        rows.push({ sku: c.sku, name, action: "keep", paidPrice, newPrice: paidPrice, diff: 0 });
      } else if (c.action === "unsure") {
        rows.push({ sku: c.sku, name, action: "unsure", paidPrice, newPrice: paidPrice, diff: 0 });
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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const h: Record<string, string> = d.content_headlines || {};
        // Override defaults only if explicitly set in settings
        if (h.terms_portal_url?.trim()) setTermsPortalUrl(h.terms_portal_url.trim());
        if (h.terms_shipping_url?.trim()) setTermsShippingUrl(h.terms_shipping_url.trim());
      })
      .catch(() => {});
  }, []);

  // If the only cost is shipping (no product diff, no refund), do not charge for shipping
  const effectiveShippingFee =
    payTotal === 0 && refundTotal === 0 && shippingFee > 0 ? 0 : shippingFee;

  const checkoutTotals = computeCheckoutTotals({
    replacePaySubtotal: payTotal,
    shippingFee: effectiveShippingFee,
    refundTotal,
    couponDiscountPercent: appliedCoupon?.discountPercent,
  });
  const {
    replacePaySubtotal,
    couponDiscountIls,
    replacePayAfterCoupon: payTotalAfterCoupon,
    netPay,
    netRefund,
  } = checkoutTotals;
  const needsPayment = netPay > 0;
  const needsAddress = needsPayment && wizard?.shipping?.type === "delivery";

  const handleSubmit = async () => {
    if (!wizard) return;
    setError(null);
    setTermsError(false);
    if (!termsAccepted) {
      setTermsError(true);
      return;
    }
    setSubmitting(true);
    try {
      const wizardToSend =
        effectiveShippingFee !== shippingFee
          ? { ...wizard, shipping: { ...wizard.shipping, fee: effectiveShippingFee } }
          : wizard;
      const res = await fetch("/api/return-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizard: wizardToSend,
          customer_address: needsAddress ? { full_name: fullName, phone, address } : undefined,
          coupon_code: appliedCoupon?.code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (data.payment_link) { window.location.href = data.payment_link; return; }
      const shippingType = wizard.shipping?.type === "branch" ? "branch" : wizard.shipping?.type === "callback" ? "callback" : "courier";
      const branchName = wizard.shipping?.branch?.name || "";
      sessionStorage.removeItem("returns_wizard");
      const refQ = data.reference_code ? `&referenceCode=${encodeURIComponent(data.reference_code)}` : "";
      router.push(
        `/success?returnId=${encodeURIComponent(data.return_id || "")}${refQ}&shippingType=${shippingType}&branchName=${encodeURIComponent(branchName)}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!wizard) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  const shippingLabel =
    wizard.shipping?.type === "branch"
      ? `החלפה / החזרה לסניף - ${wizard.shipping.branch?.name ?? ""}`
      : wizard.shipping?.type === "callback"
        ? "חזרו אלי בטלפון - חינם"
        : "שליח עד הבית";

  return (
    <div>
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
                <p style={{ fontWeight: 700, fontSize: "var(--text-body)", marginBottom: 6 }}>{row.name}</p>

                {row.action === "return" && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: 2 }}>החזרה</p>
                )}

                {row.action === "replace" && (
                  <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
                    {row.sizeLabel && (
                      <span>המוצר הרצוי: <strong style={{ color: "var(--color-text)" }}>{row.sizeLabel}</strong></span>
                    )}
                    <span>המוצר המוחלף: <strong style={{ color: "var(--color-text)" }}>{row.name}</strong></span>
                  </div>
                )}

                {row.action === "keep" && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: 2 }}>ללא שינוי</p>
                )}

                {row.action === "unsure" && (
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: 2 }}>איני בטוח/ה עדיין</p>
                )}

                {row.paidPrice > 0 && (
                  <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>מחיר ששולם: <strong style={{ color: "var(--color-text)" }}>{fmt(row.paidPrice)} ₪</strong></span>
                    {row.action === "replace" && row.newPrice > 0 && (
                      <span>מחיר למוצר המוחלף: <strong style={{ color: "var(--color-text)" }}>{fmt(row.newPrice)} ₪</strong></span>
                    )}
                    {row.action === "return" && (
                      <span style={{ fontWeight: 600, color: "var(--color-success)" }}>זיכוי: {fmt(row.paidPrice)} ₪</span>
                    )}
                    {row.action === "replace" && row.diff === 0 && (
                      <span style={{ color: "var(--color-text-muted)" }}>ללא הפרש</span>
                    )}
                  </div>
                )}
              </div>
              {/* Left: net amount badge */}
              <div style={{ textAlign: "left", direction: "ltr", flexShrink: 0 }}>
                {row.action === "return" && row.paidPrice > 0 && (
                  <span style={{ color: "var(--color-success)", fontWeight: 700, fontSize: "var(--text-body)" }}>
                    −{fmt(row.paidPrice)} ₪
                  </span>
                )}
                {row.action === "replace" && row.diff !== 0 && (
                  <span style={{ color: row.diff > 0 ? "var(--color-primary)" : "var(--color-success)", fontWeight: 700, fontSize: "var(--text-body)" }}>
                    {row.diff > 0 ? "+" : "−"}{fmt(Math.abs(row.diff))} ₪
                  </span>
                )}
                {row.action === "keep" && (
                  <span style={{ fontWeight: 700, fontSize: "var(--text-body)", direction: "ltr" }}>0 ₪</span>
                )}
                {row.action === "unsure" && (
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>—</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <Divider />

        {/* Coupon — label + pill input (right); primary CTA-style button (left); feedback below */}
        <div style={{ marginBottom: "var(--space-3)" }} dir="rtl">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.65rem",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.45rem",
                minWidth: 0,
                flex: "1 1 auto",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                קוד קופון?
              </span>
              <input
                className="input"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value);
                  if (couponFieldError) setCouponFieldError(null);
                }}
                placeholder="הקלד/י אותו כאן"
                disabled={couponApplying}
                dir="rtl"
                style={{
                  width: "10rem",
                  maxWidth: "min(10rem, 48vw)",
                  flex: "0 1 auto",
                  minWidth: 0,
                  fontSize: "var(--text-caption)",
                  padding: "0.45rem 0.75rem",
                  textAlign: "right",
                  borderRadius: 999,
                  border: "1px solid rgba(148, 163, 184, 0.45)",
                  boxShadow: "none",
                  background: "var(--color-surface-elevated)",
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={couponApplying || !couponInput.trim()}
              onClick={async () => {
                setCouponFieldError(null);
                setCouponApplying(true);
                try {
                  const res = await fetch("/api/coupon/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coupon: couponInput.trim() }),
                  });
                  const data = (await res.json().catch(() => ({}))) as {
                    isValid?: boolean;
                    discount?: string;
                    error?: string;
                  };
                  if (!res.ok) {
                    setCouponFieldError(data.error || "לא ניתן לאמת קופון כרגע");
                    setAppliedCoupon(null);
                    return;
                  }
                  if (!data.isValid) {
                    setCouponFieldError("קוד קופון אינו זמין / תקין");
                    setAppliedCoupon(null);
                    return;
                  }
                  const pct = parseFloat(String(data.discount ?? ""));
                  if (Number.isNaN(pct) || pct < 0) {
                    setCouponFieldError("קוד קופון אינו זמין / תקין");
                    setAppliedCoupon(null);
                    return;
                  }
                  setAppliedCoupon({ code: couponInput.trim(), discountPercent: pct });
                } finally {
                  setCouponApplying(false);
                }
              }}
              style={{
                width: "auto",
                minHeight: 44,
                padding: "0.5rem 1rem",
                fontSize: "var(--text-caption)",
                flexShrink: 0,
                borderRadius: "var(--radius-md)",
                alignSelf: "center",
              }}
            >
              {couponApplying ? "בודק…" : "החל קופון"}
            </button>
          </div>
          <div
            role="status"
            aria-live="polite"
            style={{ minHeight: "1.35em", marginTop: "0.35rem" }}
          >
            {couponFieldError ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-caption)",
                  color: "var(--color-error, #b91c1c)",
                  lineHeight: 1.35,
                }}
              >
                {couponFieldError}
              </p>
            ) : appliedCoupon ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-caption)",
                  color: "var(--color-success)",
                  lineHeight: 1.35,
                }}
              >
                קופון הוחל — הנחה {appliedCoupon.discountPercent}% על סכום החלפות המידה בלבד
              </p>
            ) : null}
          </div>
        </div>

        <Divider />

        {/* Subtotals — coupon on products only; shipping at full price after discount */}
        {replacePaySubtotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            <span>סה״כ הפרשים (החלפת מידה)</span>
            <span style={{ direction: "ltr" }}>+{fmt(replacePaySubtotal)} ₪</span>
          </div>
        )}
        {couponDiscountIls > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-success)", marginBottom: "var(--space-1)" }}>
            <span>הנחת קופון ({appliedCoupon?.discountPercent}% על מוצרים בלבד)</span>
            <span style={{ direction: "ltr" }}>−{fmt(couponDiscountIls)} ₪</span>
          </div>
        )}
        {couponDiscountIls > 0 && payTotalAfterCoupon > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            <span>סה״כ מוצרים לאחר הנחה</span>
            <span style={{ direction: "ltr" }}>+{fmt(payTotalAfterCoupon)} ₪</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
            {shippingLabel}
            {effectiveShippingFee > 0 && couponDiscountIls > 0 ? " (ללא הנחה)" : ""}
          </span>
          <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, direction: "ltr" }}>
            {effectiveShippingFee > 0 ? `+${fmt(effectiveShippingFee)} ₪` : "חינם"}
          </span>
        </div>
        {refundTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            <span>סה״כ זיכויים</span>
            <span style={{ direction: "ltr" }}>−{fmt(refundTotal)} ₪</span>
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
            <strong style={{ fontSize: "var(--text-subtitle)", color: "var(--color-error, #c00)" }}>זיכוי צפוי</strong>
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
            הזיכוי יוחזר לאמצעי התשלום המקורי בכפוף לבדיקת המוצר
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

      {/* Terms checkbox */}
      <div
        ref={termsRef}
        style={{
          marginBottom: "var(--space-4)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: termsError
            ? "2px solid var(--color-error, #b91c1c)"
            : "1px solid var(--color-border)",
          background: termsError ? "var(--color-error-bg)" : "var(--color-surface-elevated)",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            cursor: "pointer",
            direction: "rtl",
          }}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setTermsError(false);
            }}
            style={{
              marginTop: 3,
              width: 18,
              height: 18,
              flexShrink: 0,
              accentColor: "var(--color-primary)",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "var(--text-caption)", lineHeight: 1.6, color: "var(--color-text)" }}>
            בשליחת טופס זה אני מאשר/ת שקראתי את תקנון השימוש ב
            {termsPortalUrl ? (
              <a
                href={termsPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}
              >
                פורטל החזרות
              </a>
            ) : (
              <strong>פורטל החזרות</strong>
            )}
            {" "}ובהתאם לתקנון{" "}
            {termsShippingUrl ? (
              <a
                href={termsShippingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline" }}
              >
                מדיניות המשלוחים והביטולים
              </a>
            ) : (
              <strong>מדיניות המשלוחים והביטולים</strong>
            )}
            {" "}של החברה
            <span style={{ color: "var(--color-error, #b91c1c)", marginRight: 2 }}>*</span>
          </span>
        </label>
        {termsError && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-small)", color: "var(--color-error, #b91c1c)", marginRight: 30 }}>
            יש לאשר את התקנון לפני שליחת הבקשה
          </p>
        )}
      </div>

      {error && <div ref={errorRef} className="msg-error">{error}</div>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting || (needsAddress && (!fullName || !phone || !address))}
      >
        {submitting ? "שולח…" : needsPayment ? "המשך לתשלום" : "סיום ושליחת בקשה"}
      </button>
    </div>
  );
}
