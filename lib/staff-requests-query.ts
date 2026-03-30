import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePresetRange, type DatePreset, jerusalemDayStart, jerusalemNextDayStart } from "@/lib/jerusalem-range";
import type { StaffPayload } from "@/lib/staff-session";

const LIST_SELECT =
  "return_id, reference_code, order_id, phone, branch_id, status, staff_handling, type, items, amount_refund, amount_to_pay, shipping_fee, customer_address, webhook_payload, payplus_payment_id, payment_status, replacement_order_id, created_at, updated_at";

const DETAIL_SELECT = `${LIST_SELECT}, id, updated_by_user_id, updated_by_display_name, internal_notes`;

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
export type StaffHandlingFilterToken = "open" | "in_progress" | "completed";

/** Default: פתוח + בטיפול. `all` = no staff_handling filter. */
export function parseStaffHandlingFilter(searchParams: URLSearchParams): StaffHandlingFilterToken[] | "all" {
  const raw = searchParams.get("handling");
  if (raw === "all") return "all";
  if (raw == null || raw === "") {
    return ["open", "in_progress"];
  }
  const allowed = new Set<StaffHandlingFilterToken>(["open", "in_progress", "completed"]);
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StaffHandlingFilterToken => allowed.has(s as StaffHandlingFilterToken));
  if (parts.length === 0) return "all";
  return parts;
}

function buildStaffHandlingOrConditions(tokens: StaffHandlingFilterToken[] | "all"): string | null {
  if (tokens === "all") return null;
  const parts: string[] = [];
  for (const t of tokens) {
    if (t === "open") parts.push("staff_handling.is.null");
    if (t === "in_progress") parts.push("staff_handling.eq.in_progress");
    if (t === "completed") parts.push("staff_handling.eq.completed");
  }
  if (parts.length === 0) return null;
  return parts.join(",");
}

/** Combine text search OR-group with staff_handling OR-group using AND (PostgREST nested or/and). */
function applySearchAndHandlingFilters<T extends { or: (filter: string) => T }>(
  query: T,
  searchOr: string | null,
  handlingTokens: StaffHandlingFilterToken[] | "all"
): T {
  const handlingOr = buildStaffHandlingOrConditions(handlingTokens);
  if (searchOr && handlingOr) {
    return query.or(`and(or(${searchOr}),or(${handlingOr}))`);
  }
  if (searchOr) return query.or(searchOr);
  if (handlingOr) return query.or(handlingOr);
  return query;
}

export function buildSearchOrFilter(q: string): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const esc = escapeIlike(trimmed);
  const p = `%${esc}%`;
  return [
    `phone.ilike.${p}`,
    `order_id.ilike.${p}`,
    `return_id.ilike.${p}`,
    `reference_code.ilike.${p}`,
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
  const handling = parseStaffHandlingFilter(searchParams);
  query = applySearchAndHandlingFilters(query, orFilter, handling);

  const { data, error } = await query;
  return { data, error };
}

/** Normalize URL segment: RET-* is case-insensitive and stored uppercase (RET-00002). */
export function normalizeStaffRequestLookupKey(returnIdOrReferenceCode: string): { key: string; byReference: boolean } {
  const raw = returnIdOrReferenceCode.trim();
  if (!raw) return { key: raw, byReference: false };
  const byReference = raw.toUpperCase().startsWith("RET-");
  if (byReference) return { key: raw.toUpperCase(), byReference: true };
  return { key: raw, byReference: false };
}

export function fetchReturnRequestByReturnId(
  supabase: SupabaseClient,
  staff: StaffPayload,
  returnIdOrReferenceCode: string
) {
  const { key, byReference } = normalizeStaffRequestLookupKey(returnIdOrReferenceCode);
  let query = supabase.from("return_requests").select(DETAIL_SELECT);
  query = byReference ? query.eq("reference_code", key) : query.eq("return_id", key);
  query = applyStaffBranchFilter(query, staff);
  return query.maybeSingle();
}
