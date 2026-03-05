import { createServerClient } from "./supabase-server";
import { parseOrderDate } from "./format";

/**
 * Orders eligible for return/replace: no existing return_request for this order (no day limit).
 */
export async function getEligibleOrderIds(phone: string, orderIds: string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("return_requests")
    .select("order_id")
    .eq("phone", phone)
    .in("order_id", orderIds);
  const hasRequest = new Set((existing || []).map((r) => r.order_id));
  return new Set(orderIds.filter((id) => !hasRequest.has(id)));
}

/**
 * True if order date is within the last eligibilityDays days (inclusive).
 * Used so orders past the period are still shown but marked non-returnable.
 */
export function isOrderWithinEligibilityDays(
  order: Record<string, unknown>,
  eligibilityDays: number
): boolean {
  const ivdate = order.IVDATE ?? order.ivdate;
  const d = parseOrderDate(ivdate != null ? String(ivdate) : undefined);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orderDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - orderDay.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= eligibilityDays;
}

/** True if order status indicates cancelled (מבוטלת, בוטל, etc.). */
function isOrderCancelled(order: Record<string, unknown>): boolean {
  const s = String(order.status ?? order.STATUS ?? order.order_status ?? "").trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower === "מבוטלת" || lower === "בוטל" || lower === "בוטלה" || lower === "cancelled" || lower === "canceled";
}

/**
 * When webhook provides daysPassed: returnable only if daysPassed >= 20 (and no existing request, not cancelled).
 * If daysPassed is missing, fall back to date-based eligibility (within eligibility_days).
 */
function isOrderWithinReturnWindow(
  order: Record<string, unknown>,
  eligibilityDays: number
): boolean {
  const daysPassed = order.daysPassed ?? order.days_passed;
  if (daysPassed != null && typeof daysPassed === "number") {
    return daysPassed >= 20;
  }
  return isOrderWithinEligibilityDays(order, eligibilityDays);
}

/**
 * Mark orders with eligible (no existing return request) and set isReturnable:
 * true only when order is within return window (daysPassed >= 20 or date fallback) AND has no existing return request AND is not cancelled.
 * Orders past the period or cancelled are still included; they get isReturnable: false so the UI
 * shows them with the replace/return button disabled and the note.
 */
export function filterOrdersByEligibility(
  orders: Array<Record<string, unknown>>,
  eligibleOrderIds: Set<string>,
  eligibilityDays: number
): Array<Record<string, unknown> & { eligible?: boolean; isReturnable?: boolean; is_returnable?: boolean }> {
  return orders.map((order) => {
    const orderId = String(order.order_id ?? order.id ?? "");
    const noExistingRequest = eligibleOrderIds.has(orderId);
    const withinWindow = isOrderWithinReturnWindow(order, eligibilityDays);
    const cancelled = isOrderCancelled(order);
    const isReturnable = !cancelled && withinWindow && noExistingRequest;
    return {
      ...order,
      eligible: isReturnable,
      isReturnable,
      is_returnable: isReturnable,
    };
  });
}
