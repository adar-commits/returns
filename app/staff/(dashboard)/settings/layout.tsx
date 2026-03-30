import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";

export default async function SettingsLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  if (session.role !== "admin") {
    redirect("/staff/requests?preset=today&message=settings_admin_only");
  }
  return <>{children}</>;
}
