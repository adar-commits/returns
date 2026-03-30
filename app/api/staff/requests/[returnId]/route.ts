import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { createServerClient } from "@/lib/supabase-server";
import { applyStaffBranchFilter, fetchReturnRequestByReturnId } from "@/lib/staff-requests-query";
import type { StaffHandlingStatus } from "@/lib/db-types";

export async function GET(_request: Request, context: { params: { returnId: string } }) {
  const staff = await getStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { returnId } = context.params;
  if (!returnId) {
    return NextResponse.json({ error: "Missing return id" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await fetchReturnRequestByReturnId(supabase, staff, decodeURIComponent(returnId));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ request: data });
}

export async function PATCH(request: Request, context: { params: { returnId: string } }) {
  const staff = await getStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { returnId } = context.params;
  if (!returnId) {
    return NextResponse.json({ error: "Missing return id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sh = (body as { staff_handling?: string }).staff_handling;
  if (sh !== "in_progress" && sh !== "completed") {
    return NextResponse.json({ error: "staff_handling must be in_progress or completed" }, { status: 400 });
  }
  const supabase = createServerClient();
  const rid = decodeURIComponent(returnId).trim();
  const byReference = rid.toUpperCase().startsWith("RET-");
  let updateQuery = supabase.from("return_requests").update({ staff_handling: sh as StaffHandlingStatus });
  updateQuery = byReference ? updateQuery.eq("reference_code", rid) : updateQuery.eq("return_id", rid);
  updateQuery = applyStaffBranchFilter(updateQuery, staff);
  const { data, error } = await updateQuery.select("return_id, staff_handling, status, updated_at").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ request: data });
}
