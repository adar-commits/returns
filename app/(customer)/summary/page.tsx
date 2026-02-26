import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import SummaryView from "./summary-view";
import ProgressBar from "@/components/ui/ProgressBar";

export default async function SummaryPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <ProgressBar currentStep={3} />
      <h1>סיכום ותשלום</h1>
      <p>כמעט סיימנו - יש לוודא את הפרטים מטה</p>
      <SummaryView />
    </main>
  );
}
