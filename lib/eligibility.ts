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

/**
 * Mark orders with eligible (no existing return request) and set isReturnable:
 * true only when order is within eligibility_days AND has no existing return request.
 * Orders past the period are still included; they get isReturnable: false so the UI
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
    const withinDays = isOrderWithinEligibilityDays(order, eligibilityDays);
    const isReturnable = withinDays && noExistingRequest;
    return {
      ...order,
      eligible: isReturnable,
      isReturnable,
      is_returnable: isReturnable,
    };
  });
}
