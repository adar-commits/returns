import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import PhoneForm from "./phone-form";

export default async function CustomerHome() {
  const session = await getCustomerSession();
  if (session) redirect("/orders");
  return (
    <main style={{ padding: "2rem", maxWidth: 400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>מרכז ההחלפות וההחזרות</h1>
      <p style={{ marginBottom: "1.5rem" }}>שלום לך</p>
      <PhoneForm />
    </main>
  );
}
