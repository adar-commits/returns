import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import ShippingForm from "./shipping-form";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function ShippingPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main className="page-wrap-wide">
      <ProgressBar currentStep={2} />
      <h1 className="page-title">משלוח ואיסוף</h1>
      <p className="page-subtitle">איך תרצ/י להחזיר או להחליף את המוצרים?</p>
      <ShippingForm />
    </main>
  );
}
