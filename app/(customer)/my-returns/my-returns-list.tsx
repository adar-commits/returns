"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReturnRow = {
  return_id: string;
  order_id: string;
  status: string;
  status_label: string;
  type: string;
  amount_refund: number;
  amount_to_pay: number;
  replacement_order_id?: string;
  created_at: string;
};

export default function MyReturnsList() {
  const [list, setList] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my-returns")
      .then((r) => {
        if (r.status === 401) window.location.href = "/";
        return r.json();
      })
      .then((d) => setList(d.returns || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>טוען…</p>;
  if (list.length === 0) return <p>אין בקשות.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
      {list.map((r) => (
        <li
          key={r.return_id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            <strong>{r.return_id}</strong>
            <span>{r.status_label}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#666" }}>
            הזמנה {r.order_id} · {r.type === "return" ? "החזרה" : r.type === "replacement" ? "החלפה" : "מעורב"}
          </p>
          {r.replacement_order_id && (
            <p style={{ margin: 4, fontSize: 14 }}>הזמנת החלפה: {r.replacement_order_id}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
