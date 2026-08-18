import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getSettings } from "@/lib/settings";
import { createReturnRequest, updateReturnRequestReplacementOrderId, updateReturnRequestWebhookPayload } from "@/lib/return-request";
import { createServerClient } from "@/lib/supabase-server";
import { generatePaymentLink } from "@/lib/payplus";
import type { ReturnRequestItem } from "@/lib/db-types";
import { DEFAULT_WEBHOOK_URL, DEFAULT_APP_URL, DEFAULT_ORDERS_WEBHOOK_URL } from "@/lib/constants";
import { enrichWebhookPayloadDisplayMedia } from "@/lib/items-display-enrichment";
import { computeCheckoutTotals, fetchCouponFromWebhook } from "@/lib/coupon";
import { notifyHomGroupReturnRequest } from "@/lib/hom-group-return-request";
import { resolveCustId } from "@/lib/customer-id";
import { normalizeOrdersResponse } from "@/lib/orders-normalize";
import { fetchOrders } from "@/lib/webhooks";
import {
  fetchCustomerAddressFromOrders,
  mergeCustomerAddress,
  isCourierPickupShipping,
  type CustomerAddressPayload,
} from "@/lib/customer-address";
import {
  buildItemsDetailFromChoices,
  choicesForPayload,
  customerReturnReasons,
  enrichChoicesWithCancellationReasons,
  resolveRequestIntent,
  shippingMethodLabelHe,
  type WizardItemChoice,
} from "@/lib/return-request-items-detail";

type WizardChoice = WizardItemChoice;

type WizardOrderItem = {
  sku: string;
  product_name?: string;
  partname?: string;
  price?: number | string;
  qty?: number | string;
  [key: string]: unknown;
};

type WizardShipping = {
  type: "delivery" | "branch" | "callback";
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
    const { wizard, customer_address, coupon_code } = body as {
      wizard: Wizard;
      customer_address?: Record<string, string>;
      coupon_code?: string;
    };

    const wizardChoices = (wizard.choices || []) as WizardChoice[];
    const payloadChoices = choicesForPayload(wizardChoices);
    if (!wizard?.orderId || !wizard.choices?.length) {
      return NextResponse.json({ error: "Invalid wizard data" }, { status: 400 });
    }

    const orderItems: WizardOrderItem[] = wizard.order?.items || wizard.order?.line_items || [];

    const items: ReturnRequestItem[] = payloadChoices.map((c) => ({
      sku: c.sku,
      action: c.action as ReturnRequestItem["action"],
      reason_id: c.action === "return" ? c.reason_id : undefined,
      selected_size_id: c.action === "replace" ? c.selected_size_id : undefined,
      size_label: c.action === "replace" ? c.size_label : undefined,
      size_price: c.action === "replace" ? c.size_price : undefined,
    }));

    // Allow submission with no return/replace (e.g. only keep/unsure + callback for consultation)
    const hasReturn = items.some((i) => i.action === "return");
    const hasReplace = items.some((i) => i.action === "replace");
    const type = hasReturn && hasReplace ? "mixed" : hasReplace ? "replacement" : "return";

    const replaceLines: { paidPrice: number; newPrice: number }[] = [];
    let returnRefund = 0;

    for (const c of wizard.choices) {
      if (c.action !== "return" && c.action !== "replace") continue;
      const item = orderItems.find((i) => i.sku === c.sku);
      const itemPrice = Number(item?.price ?? 0);
      if (c.action === "return") {
        returnRefund += itemPrice;
      } else if (c.action === "replace" && c.size_price != null) {
        replaceLines.push({ paidPrice: itemPrice, newPrice: Number(c.size_price) });
      }
    }
    const shippingFee = Number(wizard.shipping?.fee ?? 0);

    const trimmedCoupon = typeof coupon_code === "string" ? coupon_code.trim() : "";
    let couponDiscountPercent = 0;
    if (trimmedCoupon) {
      const validation = await fetchCouponFromWebhook(trimmedCoupon);
      if (!validation) {
        return NextResponse.json({ error: "לא ניתן לאמת קופון כרגע" }, { status: 502 });
      }
      if (!validation.isValid) {
        return NextResponse.json({ error: "קוד קופון אינו זמין / תקין" }, { status: 400 });
      }
      const pct = parseFloat(validation.discount);
      if (Number.isNaN(pct) || pct < 0) {
        return NextResponse.json({ error: "קוד קופון אינו זמין / תקין" }, { status: 400 });
      }
      couponDiscountPercent = pct;
    }

    const checkoutTotals = computeCheckoutTotals({
      replaceLines,
      returnRefund,
      shippingFee,
      couponDiscountPercent,
    });
    const couponDiscountIls = checkoutTotals.couponDiscountIls;
    const amountToPay = checkoutTotals.replacePayDue;
    const amountRefund = returnRefund + checkoutTotals.replaceCredit;
    const totalToPay = checkoutTotals.netPay;
    const netRefund = checkoutTotals.netRefund;

    const settings = await getSettings();
    const needsPickupAddress = isCourierPickupShipping(wizard.shipping?.type);
    let resolvedCustomerAddress: CustomerAddressPayload | null = needsPickupAddress
      ? mergeCustomerAddress(customer_address, null, session.phone)
      : null;
    if (!resolvedCustomerAddress && needsPickupAddress) {
      const ordersUrl =
        settings?.orders_webhook_url || process.env.ORDERS_WEBHOOK_URL || DEFAULT_ORDERS_WEBHOOK_URL;
      const fromOrders = await fetchCustomerAddressFromOrders(session.phone, ordersUrl);
      resolvedCustomerAddress = mergeCustomerAddress(customer_address, fromOrders, session.phone);
    }

    if (needsPickupAddress && !resolvedCustomerAddress) {
      return NextResponse.json(
        { error: "נדרשת כתובת לאיסוף בשליח. נא למלא פרטי משלוח." },
        { status: 400 }
      );
    }

    const { return_id, confirm_token, reference_code } = await createReturnRequest({
      phone: session.phone,
      order_id: wizard.orderId,
      branch_id: wizard.shipping?.branch_id ?? wizard.shipping?.branch?.id ?? null,
      type,
      items,
      amount_refund: amountRefund,
      amount_to_pay: amountToPay,
      shipping_fee: shippingFee,
      customer_address: resolvedCustomerAddress,
    });
    const finalUrl =
      settings?.final_webhook_url ||
      process.env.FINAL_WEBHOOK_URL ||
      DEFAULT_WEBHOOK_URL;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_APP_URL);
    const confirmUrl = `${baseUrl}/confirm-return?token=${confirm_token}`;

    const returnReasons = customerReturnReasons(settings?.return_reasons);
    const enrichedChoices = enrichChoicesWithCancellationReasons(wizardChoices, returnReasons);
    const itemsDetail = buildItemsDetailFromChoices(enrichedChoices, orderItems, returnReasons);

    const shippingMethod = wizard.shipping?.type === "branch" ? "branch" : wizard.shipping?.type === "callback" ? "callback" : "courier";
    const requestIntent = resolveRequestIntent(wizardChoices, hasReturn, hasReplace);
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

    let custId = resolveCustId(wizard.order, undefined);
    if (!custId) {
      const ordersUrl =
        settings?.orders_webhook_url || process.env.ORDERS_WEBHOOK_URL || DEFAULT_ORDERS_WEBHOOK_URL;
      const ordersRaw = await fetchOrders(session.phone, ordersUrl);
      if (ordersRaw) {
        const ordersData = normalizeOrdersResponse(ordersRaw);
        const matchedOrder = ordersData.orders.find(
          (o) => String(o.order_id ?? o.id ?? "") === String(wizard.orderId)
        );
        custId = resolveCustId(matchedOrder, ordersData.customerDetails);
      }
    }

    const requestStatus = amountToPay > 0 ? "awaiting_payment" : "pending_approval";

    const payload = {
      return_id,
      reference_code,
      created_at: new Date().toISOString(),
      type,
      status: requestStatus,
      confirm_url: confirmUrl,
      coupon_code: trimmedCoupon || null,
      cust_id: custId,
      customer_address: resolvedCustomerAddress,
      wizard: { ...wizard, choices: enrichedChoices },
      customer: {
        cust_id: custId,
        phone: resolvedCustomerAddress?.phone || session.phone,
        full_name: resolvedCustomerAddress?.full_name || null,
        address: resolvedCustomerAddress?.address || null,
        city: resolvedCustomerAddress?.city || null,
        street: resolvedCustomerAddress?.street || null,
        house_number: resolvedCustomerAddress?.house_number || null,
        floor: resolvedCustomerAddress?.floor || null,
        apartment: resolvedCustomerAddress?.apartment || null,
        courier_notes: resolvedCustomerAddress?.courier_notes || null,
      },
      order: {
        order_id: wizard.orderId,
        cust_id: custId,
        ivdate: orderDate,
        branch: orderBranch,
        total: orderTotal,
        raw_items: orderItems,
      },
      shipping: {
        method: shippingMethod,
        method_label_he: shippingMethodLabelHe(shippingMethod),
        fee: shippingFee,
        branch: branchInfo,
        customer_delivery_address: shippingMethod === "courier" ? resolvedCustomerAddress : null,
      },
      request_intent: requestIntent,
      items_detail: itemsDetail,
      totals: {
        amount_refund: amountRefund,
        amount_to_pay: amountToPay,
        shipping_fee: shippingFee,
        net_pay: totalToPay,
        net_refund: netRefund,
        coupon_code: trimmedCoupon || null,
        coupon_discount_ils: couponDiscountIls,
        replace_products_subtotal: checkoutTotals.replaceProductsSubtotal,
        replace_products_after_discount: checkoutTotals.replaceProductsAfterDiscount,
        replace_paid_subtotal: checkoutTotals.replacePaidSubtotal,
      },
      _raw_choices: enrichedChoices,
    };

    await updateReturnRequestWebhookPayload(return_id, payload);

    void notifyHomGroupReturnRequest(payload).catch((e) =>
      console.error("HoM Group return-requests notify failed:", e)
    );

    if (totalToPay > 0) {
      const successUrl = `${baseUrl}/api/payplus/success?return_id=${encodeURIComponent(return_id)}`;
      const failureUrl = `${baseUrl}/api/payplus/failure?return_id=${encodeURIComponent(return_id)}`;
      const linkResult = await generatePaymentLink({
        amount: totalToPay,
        return_id,
        success_url: successUrl,
        failure_url: failureUrl,
        customer_name: resolvedCustomerAddress?.full_name || "Customer",
        customer_email: resolvedCustomerAddress?.email || undefined,
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
        return NextResponse.json({ return_id, reference_code, payment_link: linkResult.payment_page_link });
      }
      const errorMessage =
        linkResult && "error" in linkResult
          ? linkResult.error
          : "Unable to generate payment link. Please try again or contact support.";
      console.error("Return request: payment link failed —", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    if (totalToPay <= 0) {
      let freePathOk = true;
      if (finalUrl) {
        try {
          const res = await fetch(finalUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          freePathOk = res.ok;
          const data = await res.json().catch(() => ({}));
          if (data.orderID && type !== "return") {
            await updateReturnRequestReplacementOrderId(return_id, data.orderID);
          }
        } catch (e) {
          console.error("Final webhook error:", e);
          freePathOk = false;
        }
      }
      if (freePathOk) {
        const enriched = await enrichWebhookPayloadDisplayMedia(payload);
        if (enriched !== payload) {
          await updateReturnRequestWebhookPayload(return_id, enriched);
        }
      }
    }

    return NextResponse.json({ return_id, reference_code });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}
