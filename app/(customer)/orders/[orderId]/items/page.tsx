import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import ItemSelection from "./item-selection";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function OrderItemsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  const { orderId } = await params;
  return (
    <main className="page-wrap-wide">
      <p style={{ marginBottom: "var(--space-2)" }}>
        <a href="/orders" className="link" aria-label="חזרה להזמנות" style={{ display: "inline-flex", alignItems: "center" }}>
          <span aria-hidden>→</span>
        </a>
      </p>
      <ProgressBar currentStep={1} />
      <h1 className="page-title" style={{ marginTop: "var(--space-4)" }}>הזמנה {orderId}</h1>
      <p className="page-subtitle">בחר/י החזרה או החלפה לכל פריט</p>
      <ItemSelection orderId={orderId} />
    </main>
  );
}
