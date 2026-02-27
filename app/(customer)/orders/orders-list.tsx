"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatOrderDate } from "@/lib/format";

type Order = {
  order_id?: string;
  id?: string;
  IVDATE?: string;
  ivdate?: string;
  eligible?: boolean;
  total_price?: number | string;
  total?: number | string;
  items?: Array<{ qty?: number; product_name?: string; partname?: string; sku?: string }>;
  line_items?: Array<{ qty?: number; product_name?: string; partname?: string; sku?: string }>;
  [key: string]: unknown;
};

const ISRAEL_VAT = 1.17;

function orderProductLines(order: Order): string[] {
  const list = order.items || order.line_items || [];
  return list.map((item: { qty?: number; product_name?: string; partname?: string; sku?: string }) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const name = item.product_name || item.partname || item.sku || "פריט";
    return `${qty}x ${name}`;
  });
}

export default function OrdersList() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

const PREFETCH_KEY = "orders_prefetch";
const PREFETCH_MAX_AGE_MS = 60 * 1000;

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
  if (error) return <div className="msg-error">{error}</div>;
  if (orders.length === 0) return <div className="card"><p style={{ color: "var(--color-text-muted)", margin: 0 }}>לא נמצאו הזמנות.</p></div>;

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      {customerName && <p style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}>היי, {customerName}</p>}
      <ul className="list-plain">
        {orders.map((order) => {
          const id = String(order.order_id ?? order.id ?? "");
          const eligible = order.eligible === true;
          return (
            <li key={id} className="list-item-card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)", alignItems: "flex-start" }}>
                <strong style={{ fontSize: "var(--text-body)" }}>הזמנה {id}</strong>
                {/* Left column (RTL end): date + price */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {(order.IVDATE || order.ivdate) && (
                    <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                      {formatOrderDate(String(order.IVDATE ?? order.ivdate))}
                    </span>
                  )}
                  {(() => {
                    const raw = order.total_price ?? order.total;
                    const total = raw != null ? Number(raw) : NaN;
                    if (!Number.isFinite(total) || total <= 0) return null;
                    const exVat = Math.round(total / ISRAEL_VAT);
                    return (
                      <>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2 }}>
                          {total.toLocaleString("he-IL")} ₪
                        </span>
                        <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                          ללא מע״מ: {exVat.toLocaleString("he-IL")} ₪
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              {orderProductLines(order).length > 0 && (
                <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: 1.5 }}>
                  {orderProductLines(order).map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "auto", minWidth: 0 }}
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
                  צפה בקבלה
                </button>
                {eligible ? (
                  <Link href={`/orders/${id}/items`} className="btn btn-primary" style={{ width: "auto", minWidth: 0, textDecoration: "none" }}>
                    החלפה / החזרה
                  </Link>
                ) : (
                  <span style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--text-caption)", cursor: "not-allowed" }}>החלפה / החזרה (לא זמין)</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
