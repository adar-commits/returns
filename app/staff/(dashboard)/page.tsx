import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";
import StaffDashboard from "./staff-dashboard";

type Props = { searchParams: Promise<{ message?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  const { message } = await searchParams;
  return <StaffDashboard role={session.role} branchId={session.branch_id} message={message} />;
}
