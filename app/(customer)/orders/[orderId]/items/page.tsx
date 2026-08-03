import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import ItemSelection from "./item-selection";
import ProgressBar from "@/components/ui/ProgressBar";
import { ENABLE_SIZE_EXCHANGE } from "@/lib/constants";

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
      <h1 className="page-title" style={{ marginTop: "var(--space-4)" }}>הזמנה {orderId}</h1>
      <p className="page-subtitle">
        {ENABLE_SIZE_EXCHANGE ? "בחר/י החזרה או החלפה לכל פריט" : "יש לבחור עבור כל פריט החזרה או ללא שינוי"}
      </p>
      <ItemSelection orderId={orderId} />
    </main>
  );
}
