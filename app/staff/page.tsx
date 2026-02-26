import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";
import StaffDashboard from "./staff-dashboard";

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  return <StaffDashboard role={session.role} branchId={session.branch_id} />;
}
