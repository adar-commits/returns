import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { fetchCouponFromWebhook } from "@/lib/coupon";

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const coupon = typeof body.coupon === "string" ? body.coupon : "";
    const result = await fetchCouponFromWebhook(coupon);
    if (!result) {
      return NextResponse.json({ error: "לא ניתן לאמת קופון כרגע" }, { status: 502 });
    }
    return NextResponse.json({ isValid: result.isValid, discount: result.discount });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
