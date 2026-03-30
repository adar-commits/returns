import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePresetRange, type DatePreset, jerusalemDayStart, jerusalemNextDayStart } from "@/lib/jerusalem-range";
import type { StaffPayload } from "@/lib/staff-session";

const LIST_SELECT =
  "return_id, order_id, phone, branch_id, status, staff_handling, type, items, amount_refund, amount_to_pay, shipping_fee, customer_address, webhook_payload, payplus_payment_id, payment_status, replacement_order_id, created_at, updated_at";

const DETAIL_SELECT = `${LIST_SELECT}, id`;

export function applyStaffBranchFilter<T extends { eq: (a: string, b: string) => T }>(
  query: T,
  staff: StaffPayload
): T {
  if (staff.role === "store_manager" && staff.branch_id) {
    return query.eq("branch_id", staff.branch_id);
  }
  return query;
}

export function parseDateRange(searchParams: URLSearchParams): { from: Date; toExclusive: Date } | null {
  const presetRaw = searchParams.get("preset");
  const preset = presetRaw as DatePreset | "custom" | null;
  if (preset && ["yesterday", "today", "week", "month", "year"].includes(preset)) {
    return resolvePresetRange(preset as DatePreset);
  }
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  if (preset === "custom" && (!fromStr || !toStr)) {
    return null;
  }
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const toEnd = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toEnd.getTime())) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromStr.trim())) {
      const start = jerusalemDayStart(fromStr.trim());
      const endExclusive = /^\d{4}-\d{2}-\d{2}$/.test(toStr.trim())
        ? jerusalemNextDayStart(toStr.trim())
        : toEnd;
      return { from: start, toExclusive: endExclusive };
    }
    return { from, toExclusive: toEnd };
  }
  return null;
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** PostgREST .or() filter for free-text search across phone, ids, customer name in JSON. */
export function buildSearchOrFilter(q: string): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const esc = escapeIlike(trimmed);
  const p = `%${esc}%`;
  return [
    `phone.ilike.${p}`,
    `order_id.ilike.${p}`,
    `return_id.ilike.${p}`,
    `customer_address->>full_name.ilike.${p}`,
    `webhook_payload->customer->>full_name.ilike.${p}`,
  ].join(",");
}

export async function fetchReturnRequestsForStaff(
  supabase: SupabaseClient,
  staff: StaffPayload,
  searchParams: URLSearchParams
) {
  let query = supabase.from("return_requests").select(LIST_SELECT).order("created_at", { ascending: false });
  query = applyStaffBranchFilter(query, staff);

  const range = parseDateRange(searchParams);
  if (range) {
    query = query.gte("created_at", range.from.toISOString()).lt("created_at", range.toExclusive.toISOString());
  }

  const orFilter = buildSearchOrFilter(searchParams.get("q") || "");
  if (orFilter) {
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  return { data, error };
}

export function fetchReturnRequestByReturnId(
  supabase: SupabaseClient,
  staff: StaffPayload,
  returnId: string
) {
  let query = supabase.from("return_requests").select(DETAIL_SELECT).eq("return_id", returnId);
  query = applyStaffBranchFilter(query, staff);
  return query.maybeSingle();
}
