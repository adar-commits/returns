import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import SuccessView from "./success-view";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnId?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/");
  const { returnId } = await searchParams;
  return (
    <main className="page-wrap">
      <SuccessView returnId={returnId || ""} />
    </main>
  );
}
