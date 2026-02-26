import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { fetchOrders } from "@/lib/webhooks";
import { getEligibleOrderIds, filterOrdersByEligibility } from "@/lib/eligibility";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const ordersUrl = settings?.orders_webhook_url || process.env.ORDERS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const data = await fetchOrders(session.phone, ordersUrl);
  if (!data) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 502 });
  }
  const orderIds = (data.orders || []).map((o: Record<string, unknown>) => String(o.order_id ?? o.id ?? ""));
  const eligibleIds = await getEligibleOrderIds(session.phone, orderIds, settings?.eligibility_days ?? 30);
  const ordersWithEligibility = filterOrdersByEligibility(
    data.orders,
    settings?.eligibility_days ?? 30,
    eligibleIds
  );
  return NextResponse.json({
    orders: ordersWithEligibility,
    customerDetails: data.customerDetails,
  });
}
