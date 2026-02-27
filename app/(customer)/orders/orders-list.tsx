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
  [key: string]: unknown;
};

export default function OrdersList() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                <strong style={{ fontSize: "var(--text-body)" }}>הזמנה {id}</strong>
                {(order.IVDATE || order.ivdate) && <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>{formatOrderDate(String(order.IVDATE ?? order.ivdate))}</span>}
              </div>
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
