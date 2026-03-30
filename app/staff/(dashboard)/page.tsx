import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-session";

type Props = { searchParams: Promise<{ message?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  const { message } = await searchParams;
  const base = "/staff/requests?preset=today";
  if (message) {
    redirect(`${base}&message=${encodeURIComponent(message)}`);
  }
  redirect(base);
}
