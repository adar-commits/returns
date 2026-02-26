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
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <ProgressBar currentStep={1} />
      <p><a href="/orders" style={{ color: "#8B4513" }}>← חזרה</a></p>
      <h1>הזמנה {orderId}</h1>
      <p>בחר/י את הפריטים להחלפה או החזרה</p>
      <ItemSelection orderId={orderId} />
    </main>
  );
}
