import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { createServerClient } from "@/lib/supabase-server";
import { fetchReturnRequestsForStaff } from "@/lib/staff-requests-query";

export async function GET(request: Request) {
  const staff = await getStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const supabase = createServerClient();
  const { data, error } = await fetchReturnRequestsForStaff(supabase, staff, searchParams);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}
