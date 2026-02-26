import { redirect } from "next/navigation";
import { confirmByToken } from "@/lib/return-request";

export default async function ConfirmReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="page-wrap">
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>קישור לא תקין.</p>
        </div>
      </main>
    );
  }
  const result = await confirmByToken(token);
  if (!result) {
    return (
      <main className="page-wrap">
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>הבקשה לא נמצאה או כבר אושרה.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="page-wrap">
      <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }} aria-hidden>✓</div>
        <h1 className="page-title">אושר</h1>
        <p className="page-subtitle">בקשת ההחזרה אושרה בהצלחה.</p>
        <p style={{ fontFamily: "monospace", background: "var(--color-surface)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", margin: 0 }}>מזהה: {result.return_id}</p>
      </div>
    </main>
  );
}
