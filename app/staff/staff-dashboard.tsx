"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReturnRow = {
  return_id: string;
  order_id: string;
  phone: string;
  branch_id: string | null;
  status: string;
  type: string;
  amount_refund: number;
  amount_to_pay: number;
  replacement_order_id: string | null;
  created_at: string;
};

export default function StaffDashboard({
  role,
  branchId,
}: {
  role: string;
  branchId: string | null;
}) {
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff/returns")
      .then((r) => {
        if (r.status === 401) window.location.href = "/staff/login";
        return r.json();
      })
      .then((d) => setReturns(d.returns || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="staff-layout">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}>{role}{branchId ? ` · Branch: ${branchId}` : ""}</p>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "auto", minWidth: 0 }}
          onClick={async () => {
            await fetch("/api/staff/logout", { method: "POST" });
            router.push("/staff/login");
            router.refresh();
          }}
        >
          Log out
        </button>
      </div>
      <h2 className="page-title" style={{ marginBottom: "var(--space-2)" }}>Return requests</h2>
      <p className="page-subtitle" style={{ marginBottom: "var(--space-6)" }}>By branch</p>
      {loading ? (
        <div className="loading-block"><div className="loader" /><span>Loading…</span></div>
      ) : returns.length === 0 ? (
        <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>No return requests.</p></div>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-caption)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", background: "var(--color-surface)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Return ID</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Order</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Phone</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Branch</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.return_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontFamily: "monospace" }}>{r.return_id}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>{r.order_id}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }} dir="ltr">{r.phone}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>{r.branch_id || "—"}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>{r.status}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>{r.type}</td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
