import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import StaffFlashMessage from "./staff-flash-message";

const REQUESTS_HOME = "/staff/requests?preset=week";

function SettingsGearIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="staff-shell"
      dir="rtl"
      lang="he"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--staff-bg, #f4f5f7)",
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
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", lineHeight: 0 }}
          >
            <Image
              src="/hom-group-logo.png"
              alt="HōM GROUP"
              width={594}
              height={261}
              priority
              sizes="(max-width: 640px) 92vw, min(420px, 40vw)"
              style={{
                height: "auto",
                width: "auto",
                maxHeight: "clamp(44px, 10vw, 56px)",
                maxWidth: "min(100%, 420px)",
                objectFit: "contain",
                objectPosition: "right center",
              }}
            />
          </Link>
          <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/staff/settings"
              className="staff-nav-pill staff-settings-link"
              aria-label="הגדרות"
              title="הגדרות"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.25rem",
                height: "2.25rem",
                padding: 0,
                borderRadius: 8,
                textDecoration: "none",
                color: "#64748b",
                background: "#fff",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                boxShadow: "none",
              }}
            >
              <SettingsGearIcon />
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
