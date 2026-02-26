import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import ShippingForm from "./shipping-form";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function ShippingPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <ProgressBar currentStep={2} />
      <h1>בחירת משלוח / החזרה לסניף</h1>
      <p>איך תרצה להחזיר / להחליף את המוצרים?</p>
      <ShippingForm />
    </main>
  );
}
