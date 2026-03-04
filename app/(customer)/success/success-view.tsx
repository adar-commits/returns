"use client";

import Link from "next/link";

export default function SuccessView({
  returnId,
  shippingType,
  branchName,
}: {
  returnId: string;
  shippingType: string;
  branchName: string;
}) {
  const destinationLabel =
    shippingType === "branch" && branchName
      ? `הבקשה נשלחה לסניף ${branchName}`
      : shippingType === "callback"
        ? "יועצ/ת עיצוב תחזור אליכם עד 24 שעות"
        : "הבקשה נשלחה לשירות הלקוחות שלנו";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-6) var(--space-4)", minHeight: "60vh", justifyContent: "center" }}>

      {/* Animated checkmark circle */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--space-6)",
          boxShadow: "0 8px 32px rgba(22, 101, 52, 0.28)",
        }}
        aria-hidden
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M8 20 L16 29 L32 12"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "var(--space-2)", textAlign: "center" }}>
        הבקשה נשלחה!
      </h1>

      {/* Shipping destination */}
      <p style={{
        fontSize: "var(--text-body)",
        fontWeight: 600,
        color: "var(--color-primary)",
        textAlign: "center",
        marginBottom: "var(--space-3)",
      }}>
        {destinationLabel}
      </p>

      {/* Sub-message */}
      <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.7, maxWidth: 320, marginBottom: "var(--space-6)" }}>
        בקשתך נשלחה בהצלחה, אנחנו מיד נתפנה לטפל בה.
      </p>

      {/* Reference ID card */}
      {returnId && (
        <div
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4) var(--space-6)",
            marginBottom: "var(--space-8)",
            textAlign: "center",
            width: "100%",
            maxWidth: 360,
          }}
        >
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            מספר בקשה
          </p>
          <p style={{ fontFamily: "monospace", fontSize: "var(--text-body)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "0.04em", wordBreak: "break-all" }}>
            {returnId}
          </p>
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
            שמרו את המספר לצורך מעקב עתידי
          </p>
        </div>
      )}

      {/* Back to orders */}
      <Link
        href="/orders"
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-small)",
          color: "var(--color-text-muted)",
          textDecoration: "none",
        }}
      >
        חזרה לדף ההזמנות
      </Link>
    </div>
  );
}
