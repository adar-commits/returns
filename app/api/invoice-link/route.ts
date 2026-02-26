import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { fetchInvoiceLink } from "@/lib/webhooks";

export async function GET(request: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ivnum = request.nextUrl.searchParams.get("ivnum");
  if (!ivnum) {
    return NextResponse.json({ error: "ivnum required" }, { status: 400 });
  }
  const settings = await getSettings();
  const invoicesUrl = settings?.invoices_webhook_url || process.env.INVOICES_WEBHOOK_URL;
  if (!invoicesUrl) {
    return NextResponse.json({ error: "Invoices API not configured" }, { status: 503 });
  }
  const href = await fetchInvoiceLink(ivnum, invoicesUrl);
  if (!href) {
    return NextResponse.json({ error: "Invoice link not found" }, { status: 404 });
  }
  return NextResponse.json({ href });
}
