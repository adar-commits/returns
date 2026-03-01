import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import OrdersList from "./orders-list";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function OrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main className="page-wrap-wide">
      <ProgressBar currentStep={0} />
      <p style={{ marginBottom: "var(--space-4)" }}>
        <a href="/verify-otp" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
          <span>חזור</span>
          <span aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </span>
        </a>
      </p>
      <OrdersList />
    </main>
  );
}
