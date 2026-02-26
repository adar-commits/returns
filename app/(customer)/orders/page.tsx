import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import OrdersList from "./orders-list";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function OrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <ProgressBar currentStep={0} />
      <h1>ההזמנות שלי</h1>
      <OrdersList />
    </main>
  );
}
