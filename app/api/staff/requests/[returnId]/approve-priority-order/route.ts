import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { createServerClient } from "@/lib/supabase-server";
import { augmentWebhookPayloadForStaffView } from "@/lib/staff-payload-augment";
import { fetchReturnRequestByReturnId } from "@/lib/staff-requests-query";
import {
  buildPriorityOrderWebhookPayload,
  type StaffDetailRowForWebhook,
} from "@/lib/staff-priority-order-webhook-payload";

const DEFAULT_WEBHOOK =
  "https://redcarpet.app.n8n.cloud/webhook/e437eb1f-8b91-4c08-adbb-1b9c1d96ea09";

function webhookUrl(): string {
  return process.env.PRIORITY_APPROVE_ORDER_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK;
}

export async function POST(_request: Request, context: { params: { returnId: string } }) {
  const staff = await getStaffSession();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { returnId } = context.params;
  if (!returnId) {
    return NextResponse.json({ error: "Missing return id" }, { status: 400 });
  }

  const supabase = createServerClient();
  const decoded = decodeURIComponent(returnId);
  const { data, error } = await fetchReturnRequestByReturnId(supabase, staff, decoded);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { webhook_payload } = await augmentWebhookPayloadForStaffView(supabase, {
    return_id: data.return_id,
    shipping_fee: Number(data.shipping_fee),
    webhook_payload: data.webhook_payload as Record<string, unknown> | null,
  });

  const row = { ...data, webhook_payload };
  const payload = buildPriorityOrderWebhookPayload(row as StaffDetailRowForWebhook);

  let webhookRes: Response;
  try {
    webhookRes = await fetch(webhookUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!webhookRes.ok) {
    const text = await webhookRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Webhook returned an error",
        status: webhookRes.status,
        detail: text.slice(0, 500),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
