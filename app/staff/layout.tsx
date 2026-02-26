import Link from "next/link";

export default function StaffLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="staff-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #eee" }}>
        <Link href="/staff" style={{ fontWeight: 700 }}>Returns Hub — Staff</Link>
        <nav style={{ marginTop: "0.5rem", display: "flex", gap: "1rem" }}>
          <Link href="/staff">Dashboard</Link>
          <Link href="/staff/settings">Settings</Link>
        </nav>
      </header>
      <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
