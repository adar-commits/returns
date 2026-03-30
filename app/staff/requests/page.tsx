import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";
import StaffRequestsPageClient from "./staff-requests-page-client";

export default async function StaffRequestsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  return <StaffRequestsPageClient />;
}
