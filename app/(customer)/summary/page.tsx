import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import SummaryView from "./summary-view";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function SummaryPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main className="page-wrap-wide">
      <ProgressBar currentStep={3} />
      <h1 className="page-title">סיכום ותשלום</h1>
      <p className="page-subtitle">כמעט סיימנו — וודא/י את הפרטים מטה</p>
      <SummaryView />
    </main>
  );
}
