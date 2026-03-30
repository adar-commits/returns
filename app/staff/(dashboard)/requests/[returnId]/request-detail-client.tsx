"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../backoffice.module.css";
import {
  RETURN_STATUS_HE,
  RETURN_TYPE_HE,
  STAFF_HANDLING_HE,
  formatIls,
  formatIlsDetailed,
} from "@/lib/staff-backoffice-he";
import type { ReturnRequestItem } from "@/lib/db-types";

type RawOrderLine = {
  sku?: string;
  qty?: number | string;
  price?: number | string;
  product_name?: string;
  partname?: string;
  [key: string]: unknown;
};

type ItemsDetailRow = {
  sku?: string;
  product_name?: string;
  qty?: number;
  action_type?: string;
  paid_price?: number;
  new_size_id?: string | null;
  new_size_label?: string | null;
  new_size_price?: number | null;
  price_diff?: number | null;
  image_url?: string;
  product_url?: string;
};

type DetailRow = {
  id: string;
  return_id: string;
  order_id: string;
  phone: string;
  branch_id: string | null;
  status: string;
  staff_handling: string | null;
  type: string;
  items: ReturnRequestItem[];
  amount_refund: number;
  amount_to_pay: number;
  shipping_fee: number;
  payplus_payment_id: string | null;
  payment_status: string | null;
  replacement_order_id: string | null;
  customer_address: Record<string, unknown> | null;
  webhook_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function displayName(addr: Record<string, unknown> | null, payload: Record<string, unknown> | null): string {
  const a = (addr?.full_name as string | undefined)?.trim();
  if (a) return a;
  const c = payload?.customer as { full_name?: string } | undefined;
  const w = c?.full_name?.trim();
  if (w) return w;
  return "—";
}

function notesText(addr: Record<string, unknown> | null, payload: Record<string, unknown> | null): string {
  const n = (addr?.notes as string | undefined)?.trim();
  if (n) return n;
  const p = (payload?.notes as string | undefined)?.trim();
  if (p) return p;
  return "";
}

function formatLineDiff(diff: number | null | undefined): string {
  if (diff == null || Number.isNaN(Number(diff))) return "—";
  const d = Number(diff);
  if (d === 0) return "אין הפרש";
  if (d > 0) return `הפרש לתשלום ${formatIlsDetailed(d)}`;
  return `זיכוי ${formatIlsDetailed(-d)}`;
}

function paidAndQtyForSku(rawItems: RawOrderLine[], sku: string): { paid: number; qty: number } {
  const ri = rawItems.find((r) => r.sku === sku);
  const paid = Number(ri?.price ?? 0);
  const q = Math.max(1, Number(ri?.qty ?? 1) || 1);
  return { paid, qty: q };
}

export default function RequestDetailClient({ returnId }: { returnId: string }) {
  const [row, setRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/staff/requests/${encodeURIComponent(returnId)}`)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/staff/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.error) {
          setErr(d.error);
          setRow(null);
        } else if (d?.request) setRow(d.request);
      })
      .finally(() => setLoading(false));
  }, [returnId]);

  useEffect(() => {
    load();
  }, [load]);

  const patchHandling = (staff_handling: "in_progress" | "completed") => {
    setSaving(true);
    fetch(`/api/staff/requests/${encodeURIComponent(returnId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_handling }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.request) {
          setRow((prev) => (prev ? { ...prev, staff_handling: d.request.staff_handling, updated_at: d.request.updated_at } : prev));
        } else if (d?.error) setErr(d.error);
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="loading-block">
        <div className="loader" />
        <span>טוען…</span>
      </div>
    );
  }
  if (err || !row) {
    return (
      <div className="msg-error" role="alert">
        {err || "לא נמצא"}
      </div>
    );
  }

  const name = displayName(row.customer_address, row.webhook_payload);
  const notes = notesText(row.customer_address, row.webhook_payload);
  const order = row.webhook_payload?.order as Record<string, unknown> | undefined;
  const shipping = row.webhook_payload?.shipping as Record<string, unknown> | undefined;
  const itemsDetail = row.webhook_payload?.items_detail as ItemsDetailRow[] | undefined;
  const rawItems = (order?.raw_items as RawOrderLine[] | undefined) ?? [];

  const hasPaymentRow =
    Boolean(row.payplus_payment_id || row.payment_status) ||
    Number(row.amount_to_pay) > 0 ||
    Number(row.amount_refund) > 0;

  const paymentTypeLabel = row.payplus_payment_id ? "PayPlus" : Number(row.amount_to_pay) > 0 ? "צפי תשלום" : "זיכוי / סטטוס";
  const paymentDesc = row.payplus_payment_id || row.payment_status || "—";
  const paymentAmount =
    Number(row.amount_to_pay) > 0
      ? formatIlsDetailed(Number(row.amount_to_pay))
      : Number(row.amount_refund) > 0
        ? formatIlsDetailed(-Number(row.amount_refund))
        : "—";
  const paymentStatus = row.payment_status || (Number(row.amount_to_pay) > 0 ? "ממתין" : "—");

  return (
    <>
      <Link href="/staff/requests" className={styles.backLink}>
        ← חזרה לכל הבקשות
      </Link>

      <header className={styles.detailHeader}>
        <div>
          <h1 className={styles.detailTitle}>בקשה {row.return_id}</h1>
          <p className={styles.detailMeta}>
            נוצר: {new Date(row.created_at).toLocaleString("he-IL")} · עודכן: {new Date(row.updated_at).toLocaleString("he-IL")}
            {row.branch_id ? ` · סניף: ${row.branch_id}` : ""}
          </p>
          <p className={styles.detailMeta} style={{ marginTop: "var(--space-2)" }}>
            <span className={`${styles.badge} ${styles.badgeMuted}`} style={{ marginInlineEnd: "var(--space-2)" }}>
              סטטוס מערכת: {RETURN_STATUS_HE[row.status] || row.status}
            </span>
            {row.staff_handling ? (
              <span className={`${styles.badge} ${styles.badgeGreen}`}>
                טיפול: {STAFF_HANDLING_HE[row.staff_handling] || row.staff_handling}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeMuted}`}>טיפול: לא סומן</span>
            )}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            disabled={saving}
            onClick={() => patchHandling("in_progress")}
          >
            <svg className={styles.actionBtnIcon} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            סמן בטיפול
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            disabled={saving}
            onClick={() => patchHandling("completed")}
          >
            <svg className={styles.actionBtnIcon} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            סמן הושלם
          </button>
        </div>
      </header>

      <div className={styles.twoCol}>
        <div>
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>סיכום בקשה</h2>
            <p className={styles.detailMeta} style={{ marginBottom: "var(--space-4)" }}>
              סוג: {RETURN_TYPE_HE[row.type] || row.type} · הזמנה:{" "}
              <span dir="ltr" style={{ display: "inline-block" }}>
                {row.order_id}
              </span>
            </p>
            <table className={styles.payTable}>
              <thead>
                <tr>
                  <th>פריט מוחזר (מק״ט)</th>
                  <th>פריט חדש / החלפה</th>
                  <th style={{ width: 64 }}>כמות</th>
                  <th style={{ minWidth: 120 }}>הפרש / זיכוי</th>
                  <th style={{ width: 72 }}>תמונה</th>
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((it, i) => {
                  const detail =
                    itemsDetail && itemsDetail.length === (row.items?.length ?? 0)
                      ? itemsDetail[i]
                      : itemsDetail?.find((x) => String(x.sku) === it.sku);
                  const { paid, qty: qtyFromOrder } = paidAndQtyForSku(rawItems, it.sku);
                  const ri = rawItems.find((r) => r.sku === it.sku);
                  const returnedName =
                    detail?.product_name ||
                    it.product_name ||
                    (ri?.product_name as string | undefined) ||
                    (ri?.partname as string | undefined) ||
                    it.sku;
                  const qty = detail?.qty ?? qtyFromOrder;
                  const isReplace = it.action === "replace" || detail?.action_type === "replace";
                  let priceDiff = detail?.price_diff;
                  if (priceDiff == null) {
                    if (it.action === "return" && paid > 0) priceDiff = -paid;
                    else if (it.action === "replace" && (paid > 0 || it.size_price != null)) {
                      const np = it.size_price != null ? Number(it.size_price) : paid;
                      priceDiff = np - paid;
                    }
                  }
                  const replacementParts = [
                    isReplace ? detail?.new_size_label || it.size_label : null,
                    isReplace && detail?.new_size_id ? `מזהה: ${detail.new_size_id}` : null,
                    isReplace && detail?.new_size_price != null ? `מחיר: ${formatIlsDetailed(Number(detail.new_size_price))}` : null,
                  ].filter(Boolean);
                  const replacementLine =
                    isReplace && replacementParts.length > 0 ? replacementParts.join(" · ") : isReplace ? "החלפה" : "—";
                  const imageUrl = typeof detail?.image_url === "string" ? detail.image_url.trim() : "";
                  const productUrl = typeof detail?.product_url === "string" ? detail.product_url.trim() : "";
                  return (
                    <tr key={`${it.sku}-${i}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {returnedName}{" "}
                          <span className={styles.detailMeta} style={{ fontWeight: 500 }}>
                            (מק״ט: <span dir="ltr">{it.sku}</span>)
                          </span>
                        </div>
                        <div className={styles.detailMeta} style={{ marginTop: "var(--space-1)" }}>
                          {it.action === "replace" ? "החלפה — פריט מקורי מוחזר" : "החזרה"}
                        </div>
                        {productUrl ? (
                          <div className={styles.detailMeta} style={{ marginTop: "var(--space-1)" }}>
                            <a href={productUrl} target="_blank" rel="noopener noreferrer" dir="ltr">
                              דף מוצר
                            </a>
                          </div>
                        ) : null}
                      </td>
                      <td dir="rtl" style={{ verticalAlign: "top" }}>
                        <span style={{ fontWeight: isReplace ? 600 : 400, color: isReplace ? "var(--color-text)" : "var(--color-text-muted)" }}>
                          {replacementLine}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{qty}</td>
                      <td style={{ fontWeight: 700 }}>{formatLineDiff(priceDiff ?? null)}</td>
                      <td style={{ width: 72, verticalAlign: "top" }}>
                        {imageUrl ? (
                          <a href={productUrl || imageUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={imageUrl}
                              alt=""
                              style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, display: "block" }}
                            />
                          </a>
                        ) : (
                          <span className={styles.detailMeta}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: "var(--space-4)", textAlign: "right" }}>
              <p className={styles.detailMeta}>דמי משלוח: {formatIlsDetailed(Number(row.shipping_fee))}</p>
              <p style={{ fontWeight: 800, marginTop: "var(--space-2)" }}>
                סה״כ לתשלום: {formatIlsDetailed(Number(row.amount_to_pay))}
              </p>
              <p className={styles.detailMeta}>זיכוי צפוי: {formatIlsDetailed(Number(row.amount_refund))}</p>
              {row.replacement_order_id ? (
                <p className={styles.detailMeta}>
                  הזמנת החלפה: <span dir="ltr">{row.replacement_order_id}</span>
                </p>
              ) : null}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                תשלומים בבקשה
              </h2>
            </div>
            <table className={styles.payTable}>
              <thead>
                <tr>
                  <th>סטטוס</th>
                  <th>סכום</th>
                  <th>תיאור</th>
                  <th>סוג</th>
                  <th>#</th>
                </tr>
              </thead>
              <tbody>
                {hasPaymentRow ? (
                  <tr>
                    <td>{paymentStatus}</td>
                    <td style={{ fontWeight: 700 }}>{paymentAmount}</td>
                    <td dir="ltr" style={{ textAlign: "right" }}>
                      {String(paymentDesc)}
                    </td>
                    <td>{paymentTypeLabel}</td>
                    <td>1</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {!hasPaymentRow ? <div className={styles.payEmpty}>אין עדיין חיובים</div> : null}
            <div className={styles.payFooter}>יתרה לתשלום: {formatIlsDetailed(Number(row.amount_to_pay))}</div>
          </section>
        </div>

        <div>
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>הערות</h2>
            <div className={styles.notesBox}>{notes || "אין הערות"}</div>
          </section>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>פרטי לקוח</h2>
            <div className={styles.cardMeta} style={{ border: "none", padding: 0 }}>
              <div className={styles.cardMetaRow}>
                <span>שם</span>
                <span>{name}</span>
              </div>
              <div className={styles.cardMetaRow}>
                <span>טלפון</span>
                <span dir="ltr">{row.phone}</span>
              </div>
              {row.customer_address?.address ? (
                <div className={styles.cardMetaRow}>
                  <span>כתובת</span>
                  <span>{String(row.customer_address.address)}</span>
                </div>
              ) : null}
              {row.customer_address?.city ? (
                <div className={styles.cardMetaRow}>
                  <span>עיר</span>
                  <span>{String(row.customer_address.city)}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>מטא־דאטה</h2>
            <div className={styles.cardMeta} style={{ border: "none", padding: 0 }}>
              {order?.branch != null ? (
                <div className={styles.cardMetaRow}>
                  <span>סניף בהזמנה</span>
                  <span>{String(order.branch)}</span>
                </div>
              ) : null}
              {order?.ivdate != null || order?.IVDATE != null ? (
                <div className={styles.cardMetaRow}>
                  <span>תאריך חשבונית</span>
                  <span>{String(order.ivdate ?? order.IVDATE)}</span>
                </div>
              ) : null}
              {shipping?.method != null ? (
                <div className={styles.cardMetaRow}>
                  <span>משלוח</span>
                  <span>{String(shipping.method)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
