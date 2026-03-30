import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { createServerClient } from "@/lib/supabase-server";
import { resolveStaffDisplayName } from "@/lib/staff-display-name";
import { augmentWebhookPayloadForStaffView } from "@/lib/staff-payload-augment";
import {
  applyStaffBranchFilter,
  fetchReturnRequestByReturnId,
  normalizeStaffRequestLookupKey,
} from "@/lib/staff-requests-query";
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
  const { webhook_payload } = await augmentWebhookPayloadForStaffView(supabase, {
    return_id: data.return_id,
    shipping_fee: Number(data.shipping_fee),
    webhook_payload: data.webhook_payload as Record<string, unknown> | null,
  });
  const request = { ...data, webhook_payload };
  return NextResponse.json({ request });
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as { staff_handling?: string; internal_notes?: unknown };
  const hasNotesKey = "internal_notes" in b;
  const notesOk =
    !hasNotesKey || b.internal_notes === null || typeof b.internal_notes === "string";
  if (!notesOk) {
    return NextResponse.json({ error: "internal_notes must be a string or null" }, { status: 400 });
  }
  const hasStaff = b.staff_handling === "in_progress" || b.staff_handling === "completed";
  if (b.staff_handling !== undefined && !hasStaff) {
    return NextResponse.json({ error: "staff_handling must be in_progress or completed" }, { status: 400 });
  }
  if (!hasStaff && !hasNotesKey) {
    return NextResponse.json({ error: "Provide staff_handling and/or internal_notes" }, { status: 400 });
  }
  const supabase = createServerClient();
  const updatedByName = await resolveStaffDisplayName(supabase, staff.userId);
  const { key, byReference } = normalizeStaffRequestLookupKey(decodeURIComponent(returnId));
  const updatePayload: {
    updated_by_user_id: string;
    updated_by_display_name: string;
    staff_handling?: StaffHandlingStatus;
    internal_notes?: string | null;
  } = {
    updated_by_user_id: staff.userId,
    updated_by_display_name: updatedByName,
  };
  if (hasStaff) updatePayload.staff_handling = b.staff_handling as StaffHandlingStatus;
  if (hasNotesKey) {
    const n = b.internal_notes;
    updatePayload.internal_notes = n === null || n === undefined ? null : String(n);
  }
  let updateQuery = supabase.from("return_requests").update(updatePayload);
  updateQuery = byReference ? updateQuery.eq("reference_code", key) : updateQuery.eq("return_id", key);
  updateQuery = applyStaffBranchFilter(updateQuery, staff);
  const { data, error } = await updateQuery
    .select(
      "return_id, staff_handling, status, updated_at, updated_by_user_id, updated_by_display_name, internal_notes"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json({ request: data });
}
