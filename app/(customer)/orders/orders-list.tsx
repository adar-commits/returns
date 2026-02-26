"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  if (loading) return <p>טוען הזמנות…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (orders.length === 0) return <p>לא נמצאו הזמנות.</p>;

  return (
    <div style={{ marginTop: "1rem" }}>
      {customerName && <p>היי, {customerName}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {orders.map((order) => {
          const id = String(order.order_id ?? order.id ?? "");
          const eligible = order.eligible === true;
          return (
            <li
              key={id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span>הזמנה {id}</span>
                {order.IVDATE || order.ivdate && <span>{String(order.IVDATE ?? order.ivdate)}</span>}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={async () => {
                    const href = order.receipt_href ?? order.invoice_link ?? order.receipt_link;
                    if (href) {
                      window.open(String(href), "_blank");
                      return;
                    }
                    const ivnum = order.IVNUM ?? order.ivnum;
                    if (!ivnum) return;
                    const r = await fetch(`/api/invoice-link?ivnum=${encodeURIComponent(String(ivnum))}`);
                    const d = await r.json().catch(() => ({}));
                    if (d.href) window.open(d.href, "_blank");
                  }}
                  style={{ padding: "8px 12px", border: "1px solid #8B4513", borderRadius: 6, color: "#8B4513", background: "white", cursor: "pointer" }}
                >
                  צפה בקבלה
                </button>
                {eligible ? (
                  <Link
                    href={`/orders/${id}/items`}
                    style={{ padding: "8px 12px", backgroundColor: "#8B4513", color: "white", borderRadius: 6, textDecoration: "none" }}
                  >
                    החלפה / החזרה
                  </Link>
                ) : (
                  <span style={{ padding: "8px 12px", color: "#888", cursor: "not-allowed" }}>החלפה / החזרה (לא זמין)</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
