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
      <ProgressBar currentStep={1} />
      <p style={{ marginBottom: "var(--space-4)" }}>
        <a href="/orders" className="link" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", direction: "ltr" }}>
          ← חזרה להזמנות
        </a>
      </p>
      <h1 className="page-title">הזמנה {orderId}</h1>
      <p className="page-subtitle">בחר/י החזרה או החלפה לכל פריט</p>
      <ItemSelection orderId={orderId} />
    </main>
  );
}
