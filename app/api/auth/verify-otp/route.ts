import { NextResponse } from "next/server";
import { isOtpBypass } from "@/lib/webhooks";
import { verifyAndConsumeOtp } from "@/lib/otp";
import { createCustomerSession } from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || typeof phone !== "string" || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
    }
    const trimmed = code.trim();
    if (isOtpBypass(trimmed)) {
      await createCustomerSession(phone.trim());
      return NextResponse.json({ success: true });
    }
    const valid = await verifyAndConsumeOtp(phone.trim(), trimmed);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }
    await createCustomerSession(phone.trim());
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
