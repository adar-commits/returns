import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import MyReturnsList from "./my-returns-list";

export default async function MyReturnsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <h1>הבקשות שלי</h1>
      <MyReturnsList />
    </main>
  );
}
