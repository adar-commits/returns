import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";
import RequestDetailClient from "./request-detail-client";

export default async function StaffRequestDetailPage({ params }: { params: { returnId: string } }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  const returnId = decodeURIComponent(params.returnId);
  return <RequestDetailClient returnId={returnId} />;
}
