"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../backoffice.module.css";
import {
  RETURN_STATUS_HE,
  RETURN_TYPE_HE,
  STAFF_HANDLING_HE,
  formatIlsDetailed,
} from "@/lib/staff-backoffice-he";
import type { ReturnRequestItem } from "@/lib/db-types";
import { parseInternalNotesLog } from "@/lib/internal-notes-log";
import { buildStaffCustomerDetailRows } from "@/lib/staff-customer-details";

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
  replacement_sku?: string | null;
  price_diff?: number | null;
  image_url?: string;
  product_url?: string;
};

type DetailRow = {
  id: string;
  return_id: string;
  reference_code: string;
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
  internal_notes_log: unknown;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
  updated_by_display_name: string | null;
};

function notesText(addr: Record<string, unknown> | null, payload: Record<string, unknown> | null): string {
  const fromAddr =
    (addr?.courier_notes as string | undefined)?.trim() || (addr?.notes as string | undefined)?.trim();
  if (fromAddr) return fromAddr;
  const customer = payload?.customer as Record<string, unknown> | undefined;
  const fromCustomer =
    (customer?.courier_notes as string | undefined)?.trim() || (customer?.notes as string | undefined)?.trim();
  if (fromCustomer) return fromCustomer;
  const p = (payload?.notes as string | undefined)?.trim();
  if (p) return p;
  return "";
}

function paidAndQtyForSku(rawItems: RawOrderLine[], sku: string): { paid: number; qty: number } {
  const ri = rawItems.find((r) => r.sku === sku);
  const paid = Number(ri?.price ?? 0);
  const q = Math.max(1, Number(ri?.qty ?? 1) || 1);
  return { paid, qty: q };
}

function logisticsStatusPillClass(status: string, m: Record<string, string>): string {
  if (status === "awaiting_payment") return m.statusPillPay;
  if (status === "pending_approval" || status === "awaiting_confirm") return m.statusPillNeutral;
  if (
    ["confirmed", "pickup_awaiting", "received", "shipped", "in_transit", "delivered", "refunded"].includes(status)
  ) {
    return m.statusPillOk;
  }
  return m.statusPillNeutral;
}

function paymentStatusPillClass(status: string | null | undefined, m: Record<string, string>): string {
  const s = (status || "").toLowerCase();
  if (s.includes("paid") || s.includes("success") || s.includes("complete") || s.includes("הצלח")) return m.statusPillOk;
  if (s.includes("fail") || s.includes("error") || s.includes("שגיא") || s.includes("declin")) return m.statusPillWarn;
  if (s.includes("pending") || s.includes("await") || s.includes("ממתין")) return m.statusPillPay;
  return m.statusPillNeutral;
}

function typePillClass(type: string): string {
  if (type === "return") return styles.typePillReturn;
  if (type === "replacement") return styles.typePillReplace;
  return styles.typePillMixed;
}

function shippingMethodHe(method: string | undefined): string {
  if (method === "courier") return "משלוח עד הבית";
  if (method === "branch") return "איסוף מסניף";
  if (method === "callback") return "בקשה לחזרה טלפונית";
  if (!method) return "—";
  return method;
}

type ShippingBranchInfo = {
  branch_id?: string | null;
  branch_name?: string | null;
  branch_address?: string | null;
  branch_state?: string | null;
  branch_phone?: string | null;
  branch_hours?: string | null;
  branch_map_url?: string | null;
};

export default function RequestDetailClient({ returnId }: { returnId: string }) {
  const [row, setRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newInternalNoteDraft, setNewInternalNoteDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!approveModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setApproveModalOpen(false);
        setApproveError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approveModalOpen]);

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
          setRow((prev) =>
            prev
              ? {
                  ...prev,
                  staff_handling: d.request.staff_handling,
                  internal_notes_log:
                    d.request.internal_notes_log !== undefined
                      ? d.request.internal_notes_log
                      : prev.internal_notes_log,
                  updated_at: d.request.updated_at,
                  updated_by_user_id: d.request.updated_by_user_id ?? prev.updated_by_user_id,
                  updated_by_display_name: d.request.updated_by_display_name ?? prev.updated_by_display_name,
                }
              : prev
          );
        } else if (d?.error) setErr(d.error);
      })
      .finally(() => setSaving(false));
  };

  const submitApprovePriorityOrder = () => {
    setApproveSubmitting(true);
    setApproveError(null);
    fetch(`/api/staff/requests/${encodeURIComponent(returnId)}/approve-priority-order`, { method: "POST" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setApproveError(typeof d?.error === "string" ? d.error : "הפעולה נכשלה");
          return;
        }
        setApproveModalOpen(false);
      })
      .catch(() => setApproveError("שגיאת רשת"))
      .finally(() => setApproveSubmitting(false));
  };

  const appendInternalNote = () => {
    const text = newInternalNoteDraft.trim();
    if (!text) return;
    setSavingNotes(true);
    setErr(null);
    fetch(`/api/staff/requests/${encodeURIComponent(returnId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ append_internal_note: text }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.request) {
          setNewInternalNoteDraft("");
          setRow((prev) =>
            prev
              ? {
                  ...prev,
                  internal_notes_log:
                    d.request.internal_notes_log !== undefined
                      ? d.request.internal_notes_log
                      : prev.internal_notes_log,
                  updated_at: d.request.updated_at,
                  updated_by_user_id: d.request.updated_by_user_id ?? prev.updated_by_user_id,
                  updated_by_display_name: d.request.updated_by_display_name ?? prev.updated_by_display_name,
                }
              : prev
          );
        } else if (d?.error) setErr(d.error);
      })
      .finally(() => setSavingNotes(false));
  };

  function formatNoteTimestamp(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }

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

  const createdShort = new Date(row.created_at).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const branchLabel =
    (order?.branch != null ? String(order.branch) : null) || (row.branch_id ? String(row.branch_id) : null);

  const branchInfo = (shipping?.branch as ShippingBranchInfo | undefined) || undefined;
  const internalNotesList = parseInternalNotesLog(row.internal_notes_log);
  const customerDetailRows = buildStaffCustomerDetailRows({
    phone: row.phone,
    customer_address: row.customer_address,
    webhook_payload: row.webhook_payload,
  });
  const customerFieldDir = (key: string): "ltr" | undefined =>
    ["phone", "phone_account", "mobile", "tel", "zip", "postal_code", "email", "vat_id"].includes(key)
      ? "ltr"
      : undefined;
  const deliveryAddr = (shipping?.customer_delivery_address as Record<string, unknown> | null | undefined) || null;
  const shipMethod = typeof shipping?.method === "string" ? shipping.method : undefined;
  const shipFeeFromPayload = shipping?.fee != null ? Number(shipping.fee) : null;
  const shipFeeDisplay = shipFeeFromPayload != null && !Number.isNaN(shipFeeFromPayload) ? shipFeeFromPayload : Number(row.shipping_fee);

  /** Same net as PayPlus /api/return-request: product delta + shipping − product refunds. */
  const totalChargeDue = Math.max(
    0,
    Number(row.amount_to_pay) + Number(row.shipping_fee) - Number(row.amount_refund)
  );

  return (
    <div className={styles.detailPageWrap}>
      <div className={styles.detailBackRow} dir="rtl">
        <Link href="/staff/requests" className={styles.backLink}>
          <span dir="rtl">חזרה לכל הבקשות</span>
          <span className={styles.backLinkArrow} aria-hidden>
            →
          </span>
        </Link>
        <div className={styles.detailHeroActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnOutlineBrand} ${styles.actionBtnToolbar}`}
            disabled={saving}
            onClick={() => patchHandling("in_progress")}
          >
            סמן בטיפול
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnSuccess} ${styles.actionBtnToolbar}`}
            disabled={saving}
            onClick={() => patchHandling("completed")}
          >
            סמן הושלם
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${styles.actionBtnToolbar}`}
            disabled={saving || approveSubmitting}
            onClick={() => {
              setApproveError(null);
              setApproveModalOpen(true);
            }}
          >
            אשר הזמנה
          </button>
        </div>
      </div>

      <header className={styles.detailHeroCard}>
        <div className={styles.detailHeroMain}>
          <div className={styles.detailHeroRefStatus} dir="rtl">
            <div className={styles.detailHeroRefGroup}>
              <h1 className={styles.detailHeroId}>{row.reference_code || row.return_id}</h1>
              <button
                type="button"
                className={styles.detailHeroIdHint}
                title={`מזהה מערכת: ${row.return_id}`}
                aria-label={`מזהה מערכת: ${row.return_id}`}
              >
                ⓘ
              </button>
            </div>
            <span
              className={`${styles.statusPill} ${styles.detailHeroStatusPill} ${logisticsStatusPillClass(row.status, styles)}`}
            >
              סטטוס בקשה: {RETURN_STATUS_HE[row.status] || row.status}
            </span>
          </div>
          <div className={styles.detailHeroSubRow} dir="rtl">
            <span className={styles.detailHeroDate}>{createdShort}</span>
            {branchLabel ? <span className={styles.detailHeroDate}>{branchLabel}</span> : null}
            <span className={styles.detailHeroDate}>
              עודכן לאחרונה ע״י {row.updated_by_display_name?.trim() || "—"}
              {" · "}
              {new Date(row.updated_at).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
        {row.staff_handling ? (
          <div className={styles.detailHeroBadges}>
            <span className={`${styles.statusPill} ${styles.statusPillNeutral}`}>
              טיפול צוות: {STAFF_HANDLING_HE[row.staff_handling] || row.staff_handling}
            </span>
          </div>
        ) : null}
      </header>

      <div className={styles.twoCol}>
        <div>
          <section className={styles.detailSection}>
            <div className={styles.detailSectionTitleRow} dir="rtl">
              <h2 className={styles.detailSectionTitle}>סיכום בקשה</h2>
              <span className={`${styles.typePill} ${typePillClass(row.type)}`}>
                {RETURN_TYPE_HE[row.type] || row.type}
              </span>
            </div>
            <p className={styles.detailSectionLead}>
              הזמנה: <span dir="ltr">{row.order_id}</span>
            </p>
            <div className={styles.itemLineList} dir="rtl">
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
                const qty = Math.max(1, Number(detail?.qty ?? qtyFromOrder) || 1);
                const isReplace = it.action === "replace" || detail?.action_type === "replace";
                const paidUnit = qty > 0 ? paid / qty : paid;
                const newUnitPrice =
                  detail?.new_size_price != null && !Number.isNaN(Number(detail.new_size_price))
                    ? Number(detail.new_size_price)
                    : it.size_price != null && !Number.isNaN(Number(it.size_price))
                      ? Number(it.size_price)
                      : null;

                let priceDiff: number | null = null;
                if (isReplace && newUnitPrice != null && paidUnit >= 0) {
                  priceDiff = newUnitPrice - paidUnit;
                } else if (it.action === "return" && paid > 0) {
                  priceDiff = -paid;
                } else if (detail?.price_diff != null && !Number.isNaN(Number(detail.price_diff))) {
                  priceDiff = Number(detail.price_diff);
                } else if (it.action === "replace" && (paid > 0 || it.size_price != null)) {
                  const np = it.size_price != null ? Number(it.size_price) : paid;
                  priceDiff = np - paid;
                }
                const replSku =
                  typeof detail?.replacement_sku === "string" && detail.replacement_sku.trim()
                    ? detail.replacement_sku.trim()
                    : null;
                const newSizeLabel = detail?.new_size_label || it.size_label || null;
                const imageUrl = typeof detail?.image_url === "string" ? detail.image_url.trim() : "";
                const productUrl = typeof detail?.product_url === "string" ? detail.product_url.trim() : "";
                const unitPaid = paidUnit;
                const unitPriceLabel =
                  paid > 0 ? `מחיר: ${formatIlsDetailed(unitPaid)} × ${qty}` : `כמות: ${qty}`;
                const lineAlt = i % 2 === 1;
                const hasNumericDiff =
                  priceDiff != null && !Number.isNaN(Number(priceDiff)) && Number(priceDiff) !== 0;
                const thumbSrc = imageUrl || "/placeholder-rug.svg";
                return (
                  <div key={`${it.sku}-${i}`} className={`${styles.itemLine} ${lineAlt ? styles.itemLineAlt : ""}`}>
                    <div className={styles.itemLineThumb}>
                      <a href={productUrl || thumbSrc} target="_blank" rel="noopener noreferrer">
                        <img src={thumbSrc} alt="" />
                      </a>
                    </div>
                    <div className={styles.itemLineBody}>
                      <div className={styles.itemLineName}>
                        {productUrl ? (
                          <a
                            href={productUrl}
                            className={styles.itemLineTitleLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {returnedName}
                          </a>
                        ) : (
                          returnedName
                        )}{" "}
                        <span className={styles.itemLineNameSku} dir="ltr">
                          ({it.sku})
                        </span>
                      </div>
                      <div className={styles.itemLineSub}>{unitPriceLabel}</div>
                      {isReplace ? (
                        <>
                          <div className={styles.itemLineSub}>
                            <strong>מידה חדשה:</strong> {newSizeLabel || "—"}
                            {replSku ? (
                              <>
                                {" "}
                                <span dir="ltr">(מזהה: {replSku})</span>
                              </>
                            ) : null}
                          </div>
                          {detail?.new_size_price != null ? (
                            <div className={styles.itemLineSub}>
                              <span className={styles.itemLinePriceWord}>מחיר</span>
                              {": "}
                              {formatIlsDetailed(Number(detail.new_size_price))}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div className={styles.itemLinePriceCol}>
                      {isReplace && unitPaid > 0 ? (
                        <div
                          className={styles.itemLinePricePaidMuted}
                          dir="ltr"
                          title="מחיר יחידה ששולם בהזמנה המקורית"
                        >
                          {formatIlsDetailed(unitPaid)}
                        </div>
                      ) : null}
                      {hasNumericDiff ? (
                        <>
                          <div className={styles.itemLinePriceValue} dir="ltr">
                            {formatIlsDetailed(Math.abs(Number(priceDiff)))}
                          </div>
                          <span
                            className={`${styles.itemDiffLabel} ${
                              Number(priceDiff) < 0 ? styles.itemDiffLabelCredit : styles.itemDiffLabelPay
                            }`}
                          >
                            {Number(priceDiff) < 0 ? "זיכוי" : "תוספת תשלום"}
                          </span>
                        </>
                      ) : (
                        <div className={styles.itemLinePriceValue} dir="ltr">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.summaryTotals}>
              <p className={styles.summaryTotalsRow}>
                תוספת מוצרים (סכום שורות): {formatIlsDetailed(Number(row.amount_to_pay))}
              </p>
              <p className={styles.summaryTotalsRow}>דמי משלוח: {formatIlsDetailed(Number(row.shipping_fee))}</p>
              <p className={styles.summaryTotalsStrong}>סה״כ לתשלום: {formatIlsDetailed(totalChargeDue)}</p>
              <p className={styles.summaryTotalsRow}>
                שווי החזרה:{" "}
                {formatIlsDetailed(
                  row.webhook_payload?.return_value != null
                    ? Number(row.webhook_payload.return_value)
                    : (itemsDetail || [])
                        .filter((d) => d.action_type === "return")
                        .reduce((sum, d) => sum + (Number(d.paid_price) || 0), 0)
                )}
              </p>
              <p className={styles.summaryTotalsRow}>זיכוי צפוי (מוצרים): {formatIlsDetailed(Number(row.amount_refund))}</p>
              {row.replacement_order_id ? (
                <p className={styles.summaryTotalsRow}>
                  הזמנת החלפה: <span dir="ltr">{row.replacement_order_id}</span>
                </p>
              ) : null}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>משלוח ואספקה</h2>
            <div className={styles.shippingDetailGrid} dir="rtl">
              <div className={styles.shippingDetailRow}>
                <span className={styles.shippingDetailKey}>אופן קבלה</span>
                <span>{shippingMethodHe(shipMethod)}</span>
              </div>
              <div className={styles.shippingDetailRow}>
                <span className={styles.shippingDetailKey}>דמי משלוח בהזמנה</span>
                <span dir="ltr">{formatIlsDetailed(shipFeeDisplay)}</span>
              </div>
              {branchInfo?.branch_name ? (
                <div className={styles.shippingDetailRow}>
                  <span className={styles.shippingDetailKey}>סניף לאיסוף</span>
                  <span>{String(branchInfo.branch_name)}</span>
                </div>
              ) : null}
              {branchInfo?.branch_address ? (
                <div className={styles.shippingDetailRow}>
                  <span className={styles.shippingDetailKey}>כתובת סניף</span>
                  <span>{String(branchInfo.branch_address)}</span>
                </div>
              ) : null}
              {branchInfo?.branch_phone ? (
                <div className={styles.shippingDetailRow}>
                  <span className={styles.shippingDetailKey}>טלפון סניף</span>
                  <span dir="ltr">{String(branchInfo.branch_phone)}</span>
                </div>
              ) : null}
              {branchInfo?.branch_hours ? (
                <div className={styles.shippingDetailRow}>
                  <span className={styles.shippingDetailKey}>שעות פתיחה</span>
                  <span>{String(branchInfo.branch_hours)}</span>
                </div>
              ) : null}
              {branchInfo?.branch_map_url ? (
                <div className={styles.shippingDetailRow}>
                  <span className={styles.shippingDetailKey}>מפה</span>
                  <a href={String(branchInfo.branch_map_url)} target="_blank" rel="noopener noreferrer">
                    פתיחה בגוגל מפות
                  </a>
                </div>
              ) : null}
              {shipMethod === "courier" && deliveryAddr && Object.keys(deliveryAddr).length > 0 ? (
                <>
                  {deliveryAddr.city ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>עיר</span>
                      <span>{String(deliveryAddr.city)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.street ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>רחוב</span>
                      <span>{String(deliveryAddr.street)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.house_number ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>מס׳ בית</span>
                      <span>{String(deliveryAddr.house_number)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.floor ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>קומה</span>
                      <span>{String(deliveryAddr.floor)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.apartment ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>דירה</span>
                      <span>{String(deliveryAddr.apartment)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.courier_notes || deliveryAddr.notes ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>הוראות לשליח</span>
                      <span>{String(deliveryAddr.courier_notes || deliveryAddr.notes)}</span>
                    </div>
                  ) : null}
                  {!deliveryAddr.street && deliveryAddr.address ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>כתובת למשלוח</span>
                      <span>{String(deliveryAddr.address)}</span>
                    </div>
                  ) : null}
                  {deliveryAddr.zip ? (
                    <div className={styles.shippingDetailRow}>
                      <span className={styles.shippingDetailKey}>מיקוד</span>
                      <span dir="ltr">{String(deliveryAddr.zip)}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>תשלומים בבקשה</h2>
            {hasPaymentRow ? (
              <div className={styles.itemLineList} dir="rtl">
                <div className={styles.itemLine}>
                  <div className={styles.itemLineBody}>
                    <div className={styles.itemLineName}>{paymentTypeLabel}</div>
                    {paymentDesc && paymentDesc !== "—" ? (
                      <div className={styles.itemLineSub} dir="ltr">
                        {String(paymentDesc)}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.itemLinePriceCol}>
                    <div className={styles.itemLinePriceValue} dir="ltr">
                      {paymentAmount !== "—" ? paymentAmount : "—"}
                    </div>
                    <span className={`${styles.statusPill} ${paymentStatusPillClass(row.payment_status, styles)}`}>
                      {paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.payEmpty}>אין עדיין חיובים</div>
            )}
            <div className={styles.payFooter}>יתרה לתשלום (כולל משלוח): {formatIlsDetailed(totalChargeDue)}</div>
          </section>
        </div>

        <div>
          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>הערות פנימיות</h2>
            <div className={styles.internalNotesStack} dir="rtl">
              {internalNotesList.length === 0 ? (
                <p className={styles.internalNotesEmpty}>אין עדיין הערות פנימיות</p>
              ) : (
                internalNotesList.map((entry, idx) => (
                  <div key={`${entry.created_at}-${idx}`} className={styles.internalNoteCard}>
                    <div className={styles.internalNoteMeta}>
                      <span className={styles.internalNoteWhen}>{formatNoteTimestamp(entry.created_at)}</span>
                      <span className={styles.internalNoteAuthor}>
                        {entry.user_name?.trim() || "משתמש (ללא שם)"}
                      </span>
                    </div>
                    <div className={styles.internalNoteBody}>{entry.text}</div>
                  </div>
                ))
              )}
            </div>
            <textarea
              className={styles.internalNotesTextarea}
              dir="rtl"
              rows={4}
              value={newInternalNoteDraft}
              onChange={(e) => setNewInternalNoteDraft(e.target.value)}
              placeholder="הוספת הערה חדשה (נשמרת בנפרד — לא דורסת הערות קודמות)"
              aria-label="הוספת הערה פנימית"
            />
            <div className={styles.internalNotesActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={savingNotes || !newInternalNoteDraft.trim()}
                onClick={appendInternalNote}
              >
                הוספת הערה
              </button>
            </div>
          </section>

          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>הערות להזמנה</h2>
            <div className={styles.notesBoxElevated}>{notes || "אין הערות"}</div>
          </section>

          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>פרטי לקוח</h2>
            <div className={styles.cardMeta} style={{ border: "none", padding: 0 }}>
              {customerDetailRows.length === 0 ? (
                <p className={styles.detailSectionLead} style={{ margin: 0 }}>
                  אין פרטי לקוח שנשמרו בבקשה (או שהנתונים ריקים).
                </p>
              ) : (
                customerDetailRows.map((r) => (
                  <div key={r.key} className={styles.cardMetaRow}>
                    <span>{r.label}</span>
                    <span dir={customerFieldDir(r.key)}>{r.value}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>מטא־דאטה</h2>
            <div className={styles.cardMeta} style={{ border: "none", padding: 0 }}>
              {order?.ivdate != null || order?.IVDATE != null ? (
                <div className={styles.cardMetaRow}>
                  <span>תאריך חשבונית</span>
                  <span>{String(order.ivdate ?? order.IVDATE)}</span>
                </div>
              ) : null}
              {order?.total != null || order?.total_price != null ? (
                <div className={styles.cardMetaRow}>
                  <span>סה״כ הזמנה מקורית</span>
                  <span dir="ltr">{String(order.total ?? order.total_price)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {approveModalOpen ? (
        <div
          className={styles.staffConfirmBackdrop}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setApproveModalOpen(false);
              setApproveError(null);
            }
          }}
        >
          <div
            className={styles.staffConfirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-approve-order-title"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.staffConfirmTitle} id="staff-approve-order-title">
              האם את/ה בטוח/ה שתרצה להמשיך?
            </h2>
            <p className={styles.staffConfirmLead}>
              הפעולה תיצור הזמנה בפריוריטי כולל שליחות אם קיימת
            </p>
            {approveError ? (
              <p className={styles.staffConfirmErr} role="alert">
                {approveError}
              </p>
            ) : null}
            <div className={styles.staffConfirmActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary} ${styles.actionBtnToolbar}`}
                disabled={approveSubmitting}
                onClick={submitApprovePriorityOrder}
              >
                {approveSubmitting ? "שולח…" : "בצע פעולה"}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${styles.actionBtnToolbar}`}
                disabled={approveSubmitting}
                onClick={() => {
                  setApproveModalOpen(false);
                  setApproveError(null);
                }}
              >
                בטל פעולה
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
