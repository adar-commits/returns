import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { createReturnRequest, updateReturnRequestReplacementOrderId, updateReturnRequestWebhookPayload } from "@/lib/return-request";
import { createServerClient } from "@/lib/supabase-server";
import { generatePaymentLink } from "@/lib/payplus";
import type { ReturnRequestItem } from "@/lib/db-types";
import { DEFAULT_WEBHOOK_URL, DEFAULT_APP_URL } from "@/lib/constants";

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
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_APP_URL);
    const confirmUrl = `${baseUrl}/confirm-return?token=${confirm_token}`;

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
        action_type: c.action,
        paid_price: paidPrice,
        new_size_id: c.selected_size_id || null,
        new_size_label: c.size_label || null,
        new_size_price: newPrice,
        price_diff: priceDiff,
        reason_id: c.reason_id || null,
        reason_text: reasonText,
      };
    });

    const shippingMethod = wizard.shipping?.type === "branch" ? "branch" : wizard.shipping?.type === "callback" ? "callback" : "courier";
    const branchInfo =
      wizard.shipping?.type === "branch"
        ? {
            branch_id: wizard.shipping.branch_id || wizard.shipping.branch?.id || null,
            branch_name: wizard.shipping.branch?.name || null,
            branch_address: wizard.shipping.branch?.address || null,
            branch_state: wizard.shipping.branch?.state || null,
            branch_phone: wizard.shipping.branch?.phone || null,
            branch_hours: wizard.shipping.branch?.opening_hours || null,
            branch_map_url: wizard.shipping.branch?.map_url || null,
          }
        : null;

    const orderDate = wizard.order?.IVDATE || wizard.order?.ivdate || null;
    const orderBranch =
      wizard.order?.BRANCHDES || wizard.order?.branchdes || wizard.order?.branch_desc || null;
    const orderTotal = wizard.order?.total_price || wizard.order?.total || null;

    const payload = {
      return_id,
      created_at: new Date().toISOString(),
      type,
      status: "pending_approval",
      confirm_url: confirmUrl,
      customer: {
        phone: session.phone,
        full_name: customer_address?.full_name || null,
        address: customer_address?.address || null,
        city: customer_address?.city || null,
      },
      order: {
        order_id: wizard.orderId,
        ivdate: orderDate,
        branch: orderBranch,
        total: orderTotal,
        raw_items: orderItems,
      },
      shipping: {
        method: shippingMethod,
        fee: shippingFee,
        branch: branchInfo,
        customer_delivery_address: shippingMethod === "courier" ? customer_address || null : null,
      },
      items_detail: itemsDetail,
      totals: {
        amount_refund: amountRefund,
        amount_to_pay: amountToPay,
        shipping_fee: shippingFee,
        net_pay: totalToPay,
        net_refund: netRefund,
      },
      _raw_choices: wizard.choices,
    };

    if (totalToPay > 0) {
      await updateReturnRequestWebhookPayload(return_id, payload);
      const successUrl = `${baseUrl}/api/payplus/success?return_id=${encodeURIComponent(return_id)}`;
      const failureUrl = `${baseUrl}/api/payplus/failure?return_id=${encodeURIComponent(return_id)}`;
      const linkResult = await generatePaymentLink({
        amount: totalToPay,
        return_id,
        success_url: successUrl,
        failure_url: failureUrl,
        customer_name: customer_address?.full_name || "Customer",
        customer_email: customer_address?.email || undefined,
        customer_phone: session.phone,
      });
      if (linkResult?.payment_page_link) {
        if (linkResult.page_request_uid) {
          const supabase = createServerClient();
          await supabase
            .from("return_requests")
            .update({ payplus_payment_id: linkResult.page_request_uid })
            .eq("return_id", return_id);
        }
        return NextResponse.json({ return_id, payment_link: linkResult.payment_page_link });
      }
      const errorMessage =
        linkResult && "error" in linkResult
          ? linkResult.error
          : "Unable to generate payment link. Please try again or contact support.";
      console.error("Return request: payment link failed —", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    if (finalUrl) {
      try {
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

    return NextResponse.json({ return_id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}
