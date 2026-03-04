import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { fetchOrders } from "@/lib/webhooks";
import { normalizeOrdersResponse } from "@/lib/orders-normalize";
import { getEligibleOrderIds, filterOrdersByEligibility } from "@/lib/eligibility";
import { DEFAULT_ORDERS_WEBHOOK_URL } from "@/lib/constants";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const ordersUrl = settings?.orders_webhook_url || process.env.ORDERS_WEBHOOK_URL || DEFAULT_ORDERS_WEBHOOK_URL;
  const raw = await fetchOrders(session.phone, ordersUrl);
  if (!raw) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 502 });
  }
  const data = normalizeOrdersResponse(raw);
  const orderIds = (data.orders || []).map((o: Record<string, unknown>) => String(o.order_id ?? o.id ?? ""));
  const eligibleIds = await getEligibleOrderIds(session.phone, orderIds);
  const eligibilityDays = Math.max(1, Number(settings?.eligibility_days) || 20);
  const ordersWithEligibility = filterOrdersByEligibility(data.orders, eligibleIds, eligibilityDays);
  return NextResponse.json({
    orders: ordersWithEligibility,
    customerDetails: data.customerDetails,
  });
}
