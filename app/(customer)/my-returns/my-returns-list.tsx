"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReturnRow = {
  return_id: string;
  reference_code?: string;
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

  if (loading) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;
  if (list.length === 0) return <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>אין בקשות.</p></div>;

  return (
    <ul className="list-plain" style={{ marginTop: "var(--space-4)" }}>
      {list.map((r) => (
        <li key={r.return_id} className="list-item-card">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <div style={{ minWidth: 0 }}>
              {r.reference_code ? (
                <strong style={{ fontSize: "var(--text-body)", letterSpacing: "0.05em" }}>{r.reference_code}</strong>
              ) : (
                <strong style={{ fontFamily: "monospace", fontSize: "var(--text-body)" }}>{r.return_id}</strong>
              )}
              {r.reference_code ? (
                <p style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: "var(--text-caption)", color: "var(--color-text-muted)", wordBreak: "break-all" }}>
                  {r.return_id}
                </p>
              ) : null}
            </div>
            <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-primary)" }}>{r.status_label}</span>
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>
            הזמנה {r.order_id} · {r.type === "return" ? "החזרה" : r.type === "replacement" ? "החלפה" : "מעורב"}
          </p>
          {r.replacement_order_id && (
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-caption)" }}>הזמנת החלפה: {r.replacement_order_id}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
