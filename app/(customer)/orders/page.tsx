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
      <h1 className="page-title">ההזמנות שלי</h1>
      <p className="page-subtitle">בחר/י הזמנה להחלפה או החזרה</p>
      <OrdersList />
    </main>
  );
}
