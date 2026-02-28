import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { createReturnRequest, updateReturnRequestReplacementOrderId } from "@/lib/return-request";
import { createServerClient } from "@/lib/supabase-server";
import type { ReturnRequestItem } from "@/lib/db-types";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

type WizardChoice = {
  sku: string;
  action: "" | "return" | "replace";
  reason_id?: string;
  selected_size_id?: string;
  size_label?: string;
  size_price?: number;
};

type WizardOrderItem = {
  sku: string;
  product_name?: string;
  partname?: string;
  price?: number | string;
  qty?: number | string;
  [key: string]: unknown;
};

type WizardShipping = {
  type: "delivery" | "branch";
  fee: number;
  branch_id?: string;
  branch?: {
    id?: string;
    name?: string;
    address?: string;
    state?: string;
    phone?: string;
    email?: string;
    opening_hours?: string;
    map_url?: string;
  };
};

type Wizard = {
  orderId: string;
  order: {
    items?: WizardOrderItem[];
    line_items?: WizardOrderItem[];
    IVDATE?: string;
    ivdate?: string;
    BRANCHDES?: string;
    branchdes?: string;
    branch_desc?: string;
    total_price?: number | string;
    total?: number | string;
    [key: string]: unknown;
  };
  choices: WizardChoice[];
  shipping: WizardShipping;
};

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { wizard, customer_address } = body as { wizard: Wizard; customer_address?: Record<string, string> };

    const choicesWithAction = (wizard.choices || []).filter(
      (c) => c.action === "return" || c.action === "replace"
    );
    if (!wizard?.orderId || !wizard.choices?.length) {
      return NextResponse.json({ error: "Invalid wizard data" }, { status: 400 });
    }

    const orderItems: WizardOrderItem[] = wizard.order?.items || wizard.order?.line_items || [];

    const items: ReturnRequestItem[] = choicesWithAction.map((c) => ({
      sku: c.sku,
      action: c.action === "replace" ? "replace" : "return",
      reason_id: c.reason_id,
      selected_size_id: c.selected_size_id,
      size_label: c.size_label,
      size_price: c.size_price,
    }));

    if (items.length === 0) {
      return NextResponse.json({ error: "Select at least one item to return or replace" }, { status: 400 });
    }

    const hasReturn = items.some((i) => i.action === "return");
    const hasReplace = items.some((i) => i.action === "replace");
    const type = hasReturn && hasReplace ? "mixed" : hasReplace ? "replacement" : "return";

    let amountRefund = 0;
    let amountToPay = 0;

    for (const c of wizard.choices) {
      if (c.action !== "return" && c.action !== "replace") continue;
      const item = orderItems.find((i) => i.sku === c.sku);
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
    const netRefund = Math.max(0, amountRefund - amountToPay - shippingFee);

    const { return_id, confirm_token } = await createReturnRequest({
      phone: session.phone,
      order_id: wizard.orderId,
      branch_id: wizard.shipping?.branch_id ?? wizard.shipping?.branch?.id ?? null,
      type,
      items,
      amount_refund: amountRefund,
      amount_to_pay: amountToPay,
      shipping_fee: shippingFee,
      customer_address: customer_address || null,
    });

    const settings = await getSettings();
    const finalUrl =
      settings?.final_webhook_url ||
      process.env.FINAL_WEBHOOK_URL ||
      DEFAULT_WEBHOOK_URL;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const confirmUrl = `${baseUrl}/confirm-return?token=${confirm_token}`;

    if (finalUrl) {
      try {
        // Build a per-unit items_detail (expanded by qty)
        const returnReasons: string[] = settings?.return_reasons || [];

        const itemsDetail = choicesWithAction.map((c) => {
          const orderItem = orderItems.find((i) => i.sku === c.sku);
          const productName =
            orderItem?.product_name || orderItem?.partname || c.sku || "פריט";
          const paidPrice = Number(orderItem?.price ?? 0);
          const newPrice = c.size_price != null ? Number(c.size_price) : null;
          const priceDiff = newPrice != null ? newPrice - paidPrice : null;
          const reasonText =
            c.reason_id != null && returnReasons[Number(c.reason_id)] != null
              ? returnReasons[Number(c.reason_id)]
              : null;

          return {
            sku: c.sku,
            product_name: productName,
            qty: 1,
            action_type: c.action, // "return" or "replace"
            paid_price: paidPrice,
            // replace-specific fields
            new_size_id: c.selected_size_id || null,
            new_size_label: c.size_label || null,
            new_size_price: newPrice,
            price_diff: priceDiff, // positive = extra to pay; negative = refund
            // return-specific fields
            reason_id: c.reason_id || null,
            reason_text: reasonText,
          };
        });

        const shippingMethod =
          wizard.shipping?.type === "branch" ? "branch" : "courier";
        const branchInfo =
          wizard.shipping?.type === "branch"
            ? {
                branch_id:
                  wizard.shipping.branch_id ||
                  wizard.shipping.branch?.id ||
                  null,
                branch_name: wizard.shipping.branch?.name || null,
                branch_address: wizard.shipping.branch?.address || null,
                branch_state: wizard.shipping.branch?.state || null,
                branch_phone: wizard.shipping.branch?.phone || null,
                branch_hours: wizard.shipping.branch?.opening_hours || null,
                branch_map_url: wizard.shipping.branch?.map_url || null,
              }
            : null;

        const orderDate =
          wizard.order?.IVDATE || wizard.order?.ivdate || null;
        const orderBranch =
          wizard.order?.BRANCHDES ||
          wizard.order?.branchdes ||
          wizard.order?.branch_desc ||
          null;
        const orderTotal =
          wizard.order?.total_price || wizard.order?.total || null;

        const payload = {
          // ── Return request identity ──
          return_id,
          created_at: new Date().toISOString(),
          type, // "return" | "replacement" | "mixed"
          status: "pending_approval",
          confirm_url: confirmUrl,

          // ── Customer ──
          customer: {
            phone: session.phone,
            full_name: customer_address?.full_name || null,
            address: customer_address?.address || null,
            city: customer_address?.city || null,
          },

          // ── Original order ──
          order: {
            order_id: wizard.orderId,
            ivdate: orderDate,
            branch: orderBranch,
            total: orderTotal,
            raw_items: orderItems, // full original line items from the order webhook
          },

          // ── Shipping ──
          shipping: {
            method: shippingMethod, // "branch" or "courier"
            fee: shippingFee,
            branch: branchInfo,
            customer_delivery_address:
              shippingMethod === "courier" ? customer_address || null : null,
          },

          // ── Items (one row per unit — qty already expanded in wizard.choices) ──
          items_detail: itemsDetail,

          // ── Financial summary ──
          totals: {
            amount_refund: amountRefund,
            amount_to_pay: amountToPay,
            shipping_fee: shippingFee,
            net_pay: totalToPay,
            net_refund: netRefund,
          },

          // ── Raw wizard state (full context for debugging) ──
          _raw_choices: wizard.choices,
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
            const payId =
              payData.payment_id ?? payData.transactionId ?? payData.id;
            if (payId) {
              const supabase = createServerClient();
              await supabase
                .from("return_requests")
                .update({ payplus_payment_id: payId })
                .eq("return_id", return_id);
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
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}
