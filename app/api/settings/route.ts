import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { getStaffSession } from "@/lib/staff-session";

export async function GET() {
  try {
    const settings = await getSettings();
    if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const allowed = [
      "eligibility_days", "return_reasons", "shipping_tiers",
      "content_banner", "content_footer", "content_help_banner", "content_headlines",
      "otp_send_url", "orders_webhook_url", "sizes_webhook_url", "final_webhook_url",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    const updated = await updateSettings(updates as Parameters<typeof updateSettings>[0]);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
