import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import StaffFlashMessage from "./staff-flash-message";

const REQUESTS_HOME = "/staff/requests?preset=week";

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="staff-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--staff-bg, #eef1f4)",
      }}
    >
      <header
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <Link
            href={REQUESTS_HOME}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}
          >
            <Image
              src="/hom-group-logo.png"
              alt="HōM GROUP"
              width={132}
              height={36}
              priority
              style={{ height: "auto", width: "clamp(104px, 18vw, 132px)" }}
            />
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#64748b",
                letterSpacing: "0.02em",
                borderRight: "1px solid #e2e8f0",
                paddingRight: "0.75rem",
                marginRight: "0.25rem",
              }}
            >
              מרכז החזרות
            </span>
          </Link>
          <nav style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href={REQUESTS_HOME}
              className="staff-nav-pill staff-nav-pill--active"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 999,
                fontSize: "0.8125rem",
                fontWeight: 600,
                textDecoration: "none",
                background: "linear-gradient(180deg, #fecaca 0%, #fca5a5 100%)",
                color: "#7f1d1d",
                boxShadow: "0 1px 2px rgba(127, 29, 29, 0.15)",
              }}
            >
              כל הבקשות
            </Link>
            <Link
              href="/staff/settings"
              className="staff-nav-pill"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 999,
                fontSize: "0.8125rem",
                fontWeight: 500,
                textDecoration: "none",
                color: "#475569",
                background: "#f1f5f9",
              }}
            >
              הגדרות
            </Link>
          </nav>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          padding: "1.5rem 1.25rem 2.5rem",
          maxWidth: 1320,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Suspense fallback={null}>
          <StaffFlashMessage />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
