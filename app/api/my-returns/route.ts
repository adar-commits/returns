import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { createServerClient } from "@/lib/supabase-server";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "ממתין לאישור",
  awaiting_confirm: "ממתין לאישור",
  awaiting_payment: "ממתין לתשלום",
  confirmed: "אושר",
  pickup_awaiting: "ממתין לאיסוף",
  received: "התקבל",
  refunded: "הוחזר",
  shipped: "נשלח",
  in_transit: "בדרך",
  delivered: "נמסר",
};

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("return_requests")
    .select("return_id, order_id, status, type, amount_refund, amount_to_pay, replacement_order_id, created_at")
    .eq("phone", session.phone)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (data || []).map((r) => ({
    ...r,
    status_label: STATUS_LABELS[r.status] || r.status,
  }));
  return NextResponse.json({ returns: list });
}
