import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import PhoneForm from "./phone-form";

export default async function CustomerHome() {
  const session = await getCustomerSession();
  if (session) redirect("/orders");
  return (
    <main className="page-wrap">
      <div className="hero">
        <p className="hero-subtitle">שלום לך. הזן/י את מספר הטלפון כדי להמשיך</p>
      </div>
      <div className="card">
        <PhoneForm />
      </div>
    </main>
  );
}
