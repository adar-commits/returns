import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomerSession } from "@/lib/customer-session";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ return_id?: string; reference_code?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  const { return_id, reference_code } = await searchParams;

  return (
    <main className="page-wrap">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "var(--space-6) var(--space-4)",
          minHeight: "60vh",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "var(--color-error-bg, #fef2f2)",
            border: "2px solid var(--color-error, #b91c1c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-6)",
          }}
          aria-hidden
        >
          <span style={{ fontSize: "2.5rem", color: "var(--color-error, #b91c1c)" }}>✕</span>
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          התשלום לא הושלם
        </h1>

        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", lineHeight: 1.7, maxWidth: 360, marginBottom: "var(--space-6)" }}>
          לא הצלחנו לסיים את התשלום. תוכל/י לחזור ולנסות שוב, או ליצור קשר עם שירות הלקוחות.
        </p>

        {(reference_code || return_id) && (
          <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)", maxWidth: 400 }}>
            {reference_code ? (
              <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-body)", color: "var(--color-text)" }}>
                מספר בקשה: <strong style={{ letterSpacing: "0.06em" }}>{reference_code}</strong>
              </p>
            ) : null}
            {return_id ? (
              <p style={{ margin: 0, wordBreak: "break-all" }}>
                מזהה מערכת: <strong style={{ fontFamily: "monospace", fontSize: "var(--text-small)" }}>{return_id}</strong>
              </p>
            ) : null}
          </div>
        )}

        <Link
          href="/summary"
          className="btn btn-primary"
          style={{ textDecoration: "none", marginBottom: "var(--space-2)" }}
        >
          חזרה לסכם ולשלם שוב
        </Link>
      </div>
    </main>
  );
}
