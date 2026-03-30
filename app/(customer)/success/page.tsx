import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import SuccessView from "./success-view";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnId?: string; referenceCode?: string; shippingType?: string; branchName?: string }>;
}) {
  const { returnId, referenceCode, shippingType, branchName } = await searchParams;
  // After PayPlus redirect we may have returnId but session can be missing (e.g. cookie on redirect). Show thank you if we have returnId.
  const session = await getCustomerSession();
  if (!session && !returnId) redirect("/");
  return (
    <main className="page-wrap">
      <SuccessView
        returnId={returnId || ""}
        referenceCode={referenceCode || ""}
        shippingType={shippingType || "courier"}
        branchName={branchName || ""}
      />
    </main>
  );
}
