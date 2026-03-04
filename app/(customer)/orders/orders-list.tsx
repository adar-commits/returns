"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatOrderDate } from "@/lib/format";

type Order = {
  order_id?: string;
  id?: string;
  IVDATE?: string;
  ivdate?: string;
  status?: string;
  isReturnable?: boolean | string;
  is_returnable?: boolean | string;
  total_price?: number | string;
  total?: number | string;
  BRANCHDES?: string;
  branchdes?: string;
  BRANCHNAME?: string;
  branchname?: string;
  branch_desc?: string;
  branch_name?: string;
  items?: Array<{ qty?: number; product_name?: string; partname?: string; sku?: string }>;
  line_items?: Array<{ qty?: number; product_name?: string; partname?: string; sku?: string }>;
  [key: string]: unknown;
};

function isOrderCancelled(order: Order): boolean {
  const s = String(order.status ?? "").trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower === "מבוטלת" || lower === "בוטל" || lower === "בוטלה" || lower === "cancelled" || lower === "canceled";
}

const ISRAEL_VAT = 1.17;

function orderProductLines(order: Order): string[] {
  const list = order.items || order.line_items || [];
  return list.map((item: { qty?: number; product_name?: string; partname?: string; sku?: string }) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const name = item.product_name || item.partname || item.sku || "פריט";
    return `${qty} x ${name}`;
  });
}

function orderBranchName(order: Order): string {
  return String(
    order.BRANCHDES ?? order.branchdes ?? order.branch_desc ?? order.BRANCHNAME ?? order.branchname ?? order.branch_name ?? ""
  ).trim();
}

/** Coerce API value to boolean (handles "true", "1", true, etc.) */
function isReturnableValue(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return false;
}

const PREFETCH_KEY = "orders_prefetch";
const PREFETCH_MAX_AGE_MS = 60 * 1000;

export default function OrdersList() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [error]);

  useEffect(() => {
    const prefetched = sessionStorage.getItem(PREFETCH_KEY);
    if (prefetched) {
      try {
        const { orders: list, customerDetails: cd, at } = JSON.parse(prefetched);
        if (at && Date.now() - at < PREFETCH_MAX_AGE_MS && Array.isArray(list)) {
          setOrders(list);
          if (cd && (cd.name || cd.full_name)) setCustomerName(cd.name || cd.full_name || "");
          setLoading(false);
          sessionStorage.removeItem(PREFETCH_KEY);
          return;
        }
      } catch (_) {}
    }
    fetch("/api/orders")
      .then((r) => {
        if (r.status === 401) window.location.href = "/";
        return r.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        const cd = data.customerDetails || data.customer_details;
        if (cd && (cd.name || cd.full_name)) setCustomerName(cd.name || cd.full_name || "");
      })
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-block"><div className="loader" /><span>טוען הזמנות…</span></div>;
  if (error) return <div ref={errorRef} className="msg-error">{error}</div>;
  if (orders.length === 0) return <div className="card"><p style={{ color: "var(--color-text-muted)", margin: 0 }}>לא נמצאו הזמנות.</p></div>;

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      {/* Greeting */}
      <p style={{ marginBottom: "var(--space-5)", fontSize: "var(--text-body)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
        {customerName
          ? <>היי, <strong style={{ color: "var(--color-text)" }}>{customerName}</strong> — בחר/י הזמנה להחלפה או החזרה</>
          : "בחר/י הזמנה להחלפה או החזרה"}
      </p>

      <ul className="list-plain">
        {orders.map((order) => {
          const id = String(order.order_id ?? order.id ?? "");
          const cancelled = isOrderCancelled(order);
          const canReturn = !cancelled && isReturnableValue(order.isReturnable ?? order.is_returnable);
          const branch = orderBranchName(order);

          const raw = order.total_price ?? order.total;
          const totalNum = raw != null ? Number(raw) : NaN;
          const hasTotal = Number.isFinite(totalNum) && totalNum > 0;
          const exVat = hasTotal ? Math.round(totalNum / ISRAEL_VAT) : 0;

          return (
            <li key={id} className="list-item-card">
              {/* Row 1: order ID (right) + iv-date (left) on same line */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                <strong style={{ fontSize: "var(--text-body)" }}>
                  הזמנה {id}{cancelled ? " (מבוטלת)" : ""}
                </strong>
                {(order.IVDATE || order.ivdate) && (
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {formatOrderDate(String(order.IVDATE ?? order.ivdate))}
                  </span>
                )}
              </div>

              {/* Row 2: branch — below iv-date, aligned left */}
              {branch && (
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", textAlign: "left" }}>
                  סניף: {branch}
                </div>
              )}

              {/* Items */}
              {orderProductLines(order).length > 0 && (
                <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: 1.6, overflowWrap: "break-word", wordBreak: "break-word" }}>
                  {orderProductLines(order).map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}

              {/* Bottom row: price (left/end) inline with buttons (right/start) */}
              <div className="order-bottom-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {/* Buttons - always side by side */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-1)" }}>
                  <div className="order-card-buttons" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "nowrap" }}>
                    {canReturn ? (
                      <Link href={`/orders/${id}/items`} className="btn btn-primary" style={{ width: "auto", minWidth: 0, textDecoration: "none", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                        החלפה / החזרה
                      </Link>
                    ) : (
                      <button type="button" className="btn btn-primary" disabled style={{ width: "auto", minWidth: 0, fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                        החלפה / החזרה
                      </button>
                    )}
                    <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "auto", minWidth: 0, fontSize: "0.8125rem", whiteSpace: "nowrap" }}
                    onClick={async () => {
                      const href = order.receipt_href ?? order.invoice_link ?? order.receipt_link;
                      if (href) { window.open(String(href), "_blank"); return; }
                      const ivnum = order.IVNUM ?? order.ivnum;
                      if (!ivnum) return;
                      const r = await fetch(`/api/invoice-link?ivnum=${encodeURIComponent(String(ivnum))}`);
                      const d = await r.json().catch(() => ({}));
                      if (d.href) window.open(d.href, "_blank");
                    }}
                  >
                    צפה בחשבונית
                  </button>
                  </div>
                  {!canReturn && (
                    <p style={{ margin: 0, fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                      {cancelled ? "ההזמנה מבוטלת" : "חלפה התקופה בה ניתן לבצע החזרה / החלפה"}
                    </p>
                  )}
                </div>

                {/* Price — same row as buttons, on the left (RTL end) */}
                {hasTotal && (
                  <div className="order-price" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2 }}>
                      ₪{totalNum.toLocaleString("he-IL")}
                    </span>
                    <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                      ללא מע״מ: {exVat.toLocaleString("he-IL")} ₪
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Different phone — below last order card */}
      <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "auto", minWidth: 0, fontSize: "var(--text-small)" }}
          onClick={async () => {
            sessionStorage.clear();
            try { await fetch("/api/auth/reset", { method: "POST" }); } catch (_) {}
            window.location.href = "/";
          }}
        >
          הזמנת על טלפון אחר? לחץ כאן
        </button>
      </div>
    </div>
  );
}
