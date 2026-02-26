import { createServerClient } from "./supabase-server";

/**
 * Check if order is eligible for return/replace: within eligibility_days of IVDATE and no existing return_request for this order.
 */
export async function getEligibleOrderIds(
  phone: string,
  orderIds: string[],
  eligibilityDays: number
): Promise<Set<string>> {
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
 * Filter orders: eligible only if IVDATE is within last eligibilityDays days and no existing return request.
 */
export function filterOrdersByEligibility(
  orders: Array<Record<string, unknown>>,
  eligibilityDays: number,
  eligibleOrderIds: Set<string>
): Array<Record<string, unknown> & { eligible?: boolean }> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - eligibilityDays);

  return orders.map((order) => {
    const orderId = String(order.order_id ?? order.id ?? "");
    const ivdate = order.IVDATE ?? order.ivdate;
    const dateStr = typeof ivdate === "string" ? ivdate : null;
    const orderDate = dateStr ? new Date(dateStr) : null;
    const withinDays = orderDate ? orderDate >= cutoff : false;
    const noExisting = eligibleOrderIds.has(orderId);
    const eligible = withinDays && noExisting;
    return { ...order, eligible };
  });
}
