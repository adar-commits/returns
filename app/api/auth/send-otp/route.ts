import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { sendOtp } from "@/lib/webhooks";
import { createAndStoreOtp } from "@/lib/otp";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }
    const settings = await getSettings();
    const sendUrl = settings?.otp_send_url || process.env.OTP_SEND_URL || DEFAULT_WEBHOOK_URL;
    const code = await createAndStoreOtp(phone.trim());
    const { ok, error } = await sendOtp(phone.trim(), sendUrl, code);
    if (!ok) {
      return NextResponse.json({ error: error || "Failed to send code" }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
