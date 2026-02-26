import Link from "next/link";

export default function StaffLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="staff-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-surface)" }}>
      <header style={{ padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-elevated)" }}>
        <Link href="/staff" style={{ fontWeight: 700, fontSize: "var(--text-subtitle)", color: "var(--color-text)", textDecoration: "none" }}>Returns Hub — Staff</Link>
        <nav style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-4)" }}>
          <Link href="/staff" className="link" style={{ fontSize: "var(--text-caption)" }}>Dashboard</Link>
          <Link href="/staff/settings" className="link" style={{ fontSize: "var(--text-caption)" }}>Settings</Link>
        </nav>
      </header>
      <main style={{ flex: 1, padding: "var(--space-6)", maxWidth: 900, margin: "0 auto", width: "100%" }}>{children}</main>
    </div>
  );
}
