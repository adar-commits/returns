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
        <div style={{ background: "var(--color-surface)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", margin: 0 }}>
          {result.reference_code ? (
            <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--text-body)" }}>מספר בקשה: {result.reference_code}</p>
          ) : null}
          <p style={{ margin: result.reference_code ? "var(--space-2) 0 0" : 0, fontFamily: "monospace", fontSize: "var(--text-small)", color: "var(--color-text-muted)", wordBreak: "break-all" }}>
            מזהה מערכת: {result.return_id}
          </p>
        </div>
      </div>
    </main>
  );
}
