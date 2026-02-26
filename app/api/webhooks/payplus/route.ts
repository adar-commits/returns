import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSettings } from "@/lib/settings";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

/**
 * Payplus calls this when payment succeeds. Verify signature/body per Payplus docs,
 * then update return_requests and optionally notify n8n.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = body.payment_id ?? body.id ?? body.transactionId;
    const status = body.status ?? body.payment_status;
    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }
    const supabase = createServerClient();
    const { data: row } = await supabase
      .from("return_requests")
      .select("id, return_id, final_webhook_url")
      .eq("payplus_payment_id", paymentId)
      .single();

    if (!row) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    if (status === "success" || status === "approved" || body.success === true) {
      await supabase
        .from("return_requests")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", row.id);

      const settings = await getSettings();
      const finalUrl = settings?.final_webhook_url || process.env.FINAL_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
      if (finalUrl) {
        await fetch(finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ return_id: row.return_id, event: "payment_success" }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
