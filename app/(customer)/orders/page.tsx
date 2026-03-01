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
          חזור <span aria-hidden>→</span>
        </a>
      </p>
      <OrdersList />
    </main>
  );
}
