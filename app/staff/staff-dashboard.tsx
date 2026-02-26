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
    <div>
      <p style={{ marginBottom: 16 }}>Role: {role} {branchId && `· Branch: ${branchId}`}</p>
      <h2>Requests (by branch)</h2>
      {loading ? (
        <p>Loading…</p>
      ) : returns.length === 0 ? (
        <p>No return requests.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Return ID</th>
              <th style={{ textAlign: "left", padding: 8 }}>Order</th>
              <th style={{ textAlign: "left", padding: 8 }}>Phone</th>
              <th style={{ textAlign: "left", padding: 8 }}>Branch</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", padding: 8 }}>Type</th>
              <th style={{ textAlign: "left", padding: 8 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.return_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{r.return_id}</td>
                <td style={{ padding: 8 }}>{r.order_id}</td>
                <td style={{ padding: 8 }}>{r.phone}</td>
                <td style={{ padding: 8 }}>{r.branch_id || "—"}</td>
                <td style={{ padding: 8 }}>{r.status}</td>
                <td style={{ padding: 8 }}>{r.type}</td>
                <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/staff/logout", { method: "POST" });
          router.push("/staff/login");
          router.refresh();
        }}
        style={{ marginTop: 24, padding: "8px 16px" }}
      >
        Log out
      </button>
    </div>
  );
}
