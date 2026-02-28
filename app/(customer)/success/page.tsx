import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import SuccessView from "./success-view";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnId?: string; shippingType?: string; branchName?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  const { returnId, shippingType, branchName } = await searchParams;
  return (
    <main className="page-wrap">
      <SuccessView
        returnId={returnId || ""}
        shippingType={shippingType || "courier"}
        branchName={branchName || ""}
      />
    </main>
  );
}
