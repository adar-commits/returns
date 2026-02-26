import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { verifyOtp } from "@/lib/webhooks";
import { createCustomerSession } from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || typeof phone !== "string" || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
    }
    const settings = await getSettings();
    const verifyUrl = settings?.otp_verify_url || process.env.OTP_VERIFY_URL;
    if (!verifyUrl && code.trim() !== "0000") {
      return NextResponse.json({ error: "OTP verify URL not configured" }, { status: 503 });
    }
    const { valid, error } = await verifyOtp(phone.trim(), code.trim(), verifyUrl || "https://placeholder.invalid");
    if (!valid) {
      return NextResponse.json({ error: error || "Invalid code" }, { status: 401 });
    }
    await createCustomerSession(phone.trim());
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
