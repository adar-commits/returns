import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const staff = await getStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  let query = supabase
    .from("return_requests")
    .select("return_id, order_id, phone, branch_id, status, type, amount_refund, amount_to_pay, replacement_order_id, created_at")
    .order("created_at", { ascending: false });
  if (staff.role === "store_manager" && staff.branch_id) {
    query = query.eq("branch_id", staff.branch_id);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ returns: data || [] });
}
