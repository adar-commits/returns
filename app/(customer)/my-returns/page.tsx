import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import MyReturnsList from "./my-returns-list";

export default async function MyReturnsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main className="page-wrap-wide">
      <h1 className="page-title">הבקשות שלי</h1>
      <p className="page-subtitle">מעקב אחרי בקשת החלפה והחזרה</p>
      <MyReturnsList />
    </main>
  );
}
