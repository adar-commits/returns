import { createServerClient } from "./supabase-server";

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
 * Mark orders as eligible if they have no existing return request (no day limit).
 */
export function filterOrdersByEligibility(
  orders: Array<Record<string, unknown>>,
  eligibleOrderIds: Set<string>
): Array<Record<string, unknown> & { eligible?: boolean }> {
  return orders.map((order) => {
    const orderId = String(order.order_id ?? order.id ?? "");
    const eligible = eligibleOrderIds.has(orderId);
    return { ...order, eligible };
  });
}
