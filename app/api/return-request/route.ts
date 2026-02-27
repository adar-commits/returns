import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { createReturnRequest, updateReturnRequestReplacementOrderId } from "@/lib/return-request";
import { createServerClient } from "@/lib/supabase-server";
import type { ReturnRequestItem } from "@/lib/db-types";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { wizard, customer_address } = body;
    const choicesWithAction = (wizard.choices || []).filter((c: { action?: string }) => c.action === "return" || c.action === "replace");
    if (!wizard?.orderId || !wizard.choices?.length) {
      return NextResponse.json({ error: "Invalid wizard data" }, { status: 400 });
    }

    const items: ReturnRequestItem[] = choicesWithAction.map((c: { sku: string; action: string; reason_id?: string; selected_size_id?: string }) => ({
      sku: c.sku,
      action: c.action === "replace" ? "replace" : "return",
      reason_id: c.reason_id,
      selected_size_id: c.selected_size_id,
    }));

    if (items.length === 0) {
      return NextResponse.json({ error: "Select at least one item to return or replace" }, { status: 400 });
    }

    const hasReturn = items.some((i) => i.action === "return");
    const hasReplace = items.some((i) => i.action === "replace");
    const type = hasReturn && hasReplace ? "mixed" : hasReplace ? "replacement" : "return";

    let amountRefund = 0;
    let amountToPay = 0;
    const orderItems = wizard.order?.items || wizard.order?.line_items || [];
    for (const c of wizard.choices) {
      if (c.action !== "return" && c.action !== "replace") continue;
      const item = orderItems.find((i: { sku: string }) => i.sku === c.sku);
      const itemPrice = Number(item?.price ?? 0);
      if (c.action === "return") {
        amountRefund += itemPrice;
      } else if (c.action === "replace" && c.size_price != null) {
        const diff = Number(c.size_price) - itemPrice;
        if (diff > 0) amountToPay += diff;
        else amountRefund += -diff;
      }
    }
    const shippingFee = Number(wizard.shipping?.fee ?? 0);
    const totalToPay = Math.max(0, amountToPay + shippingFee - amountRefund);

    const { return_id, confirm_token } = await createReturnRequest({
      phone: session.phone,
      order_id: wizard.orderId,
      branch_id: wizard.shipping?.branch_id ?? null,
      type,
      items,
      amount_refund: amountRefund,
      amount_to_pay: amountToPay,
      shipping_fee: shippingFee,
      customer_address: customer_address || null,
    });

    const settings = await getSettings();
    const finalUrl = settings?.final_webhook_url || process.env.FINAL_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const confirmUrl = `${baseUrl}/confirm-return?token=${confirm_token}`;

    if (finalUrl) {
      try {
        const payload = {
          return_id,
          phone: session.phone,
          order_id: wizard.orderId,
          items,
          amount_refund: amountRefund,
          amount_to_pay: amountToPay,
          shipping_fee: shippingFee,
          type,
          confirm_url: confirmUrl,
          customer_address,
        };
        const res = await fetch(finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (data.orderID && type !== "return") {
          await updateReturnRequestReplacementOrderId(return_id, data.orderID);
        }
      } catch (e) {
        console.error("Final webhook error:", e);
      }
    }

    if (totalToPay > 0) {
      const payplusUrl = process.env.PAYPLUS_API_URL;
      if (payplusUrl) {
        try {
          const payRes = await fetch(payplusUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: totalToPay,
              return_id,
              customer_phone: session.phone,
              customer_name: customer_address?.full_name,
            }),
          });
          const payData = await payRes.json().catch(() => ({}));
          if (payData.payment_link) {
            const payId = payData.payment_id ?? payData.transactionId ?? payData.id;
            if (payId) {
              const supabase = createServerClient();
              await supabase.from("return_requests").update({ payplus_payment_id: payId }).eq("return_id", return_id);
            }
            return NextResponse.json({ return_id, payment_link: payData.payment_link });
          }
        } catch (e) {
          console.error("Payplus error:", e);
        }
      }
    }

    return NextResponse.json({ return_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create return request" }, { status: 500 });
  }
}
