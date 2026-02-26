"use client";

import Link from "next/link";

export default function SuccessView({ returnId }: { returnId: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }} aria-hidden>✓</div>
      <h1 className="page-title" style={{ marginBottom: "var(--space-2)" }}>תודה</h1>
      <p className="page-subtitle" style={{ marginBottom: "var(--space-6)" }}>בקשתך התקבלה בהצלחה.</p>
      {returnId && (
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--text-body)", fontFamily: "monospace", background: "var(--color-surface)", padding: "var(--space-3)", borderRadius: "var(--radius-sm)" }}>
          מזהה: {returnId}
        </p>
      )}
      <Link href="/my-returns" className="btn btn-primary" style={{ textDecoration: "none" }}>
        צפייה בסטטוס הבקשות שלי
      </Link>
    </div>
  );
}
