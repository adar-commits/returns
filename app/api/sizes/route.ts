import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchSizes } from "@/lib/webhooks";

export async function POST(request: Request) {
  try {
    const { sku } = await request.json();
    if (!sku || typeof sku !== "string") {
      return NextResponse.json({ error: "sku required" }, { status: 400 });
    }
    const settings = await getSettings();
    const sizesUrl = settings?.sizes_webhook_url || process.env.SIZES_WEBHOOK_URL;
    if (!sizesUrl) {
      return NextResponse.json({ error: "Sizes API not configured" }, { status: 503 });
    }
    const sizes = await fetchSizes(sku, sizesUrl);
    return NextResponse.json({ sizes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
