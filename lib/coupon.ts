import { DEFAULT_COUPON_WEBHOOK_URL } from "@/lib/constants";

export type CouponWebhookResult = { isValid: boolean; discount: string };

/**
 * POST { coupon } to n8n; returns null on network/parse failure.
 * `discount` is treated as a percentage (e.g. "10.5" = 10.5%) off amounts due for size-replacement only (not shipping).
 */
export async function fetchCouponFromWebhook(coupon: string): Promise<CouponWebhookResult | null> {
  const url = process.env.COUPON_WEBHOOK_URL || DEFAULT_COUPON_WEBHOOK_URL;
  const trimmed = coupon.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coupon: trimmed }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { isValid?: unknown; discount?: unknown };
    return {
      isValid: Boolean(data.isValid),
      discount: data.discount != null ? String(data.discount) : "0",
    };
  } catch {
    return null;
  }
}

/** ILS amount rounded to 2 decimals (same as display). */
export function roundIls(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Apply webhook discount as percent of `replacePaySubtotal` (sum of positive replace price diffs only).
 * Shipping is never included in this base.
 */
export function couponDiscountIlsFromPercent(replacePaySubtotal: number, discountPercent: number): number {
  if (replacePaySubtotal <= 0 || !Number.isFinite(discountPercent) || discountPercent <= 0) return 0;
  return roundIls((replacePaySubtotal * discountPercent) / 100);
}

export type CheckoutTotalsInput = {
  /** Sum of positive size-replacement price diffs only (never includes shipping). */
  replacePaySubtotal: number;
  shippingFee: number;
  refundTotal: number;
  /** Webhook percent (e.g. 10 = 10%). Omit or 0 when no coupon. */
  couponDiscountPercent?: number;
};

export type CheckoutTotalsResult = {
  replacePaySubtotal: number;
  couponDiscountIls: number;
  replacePayAfterCoupon: number;
  shippingFee: number;
  refundTotal: number;
  netPay: number;
  netRefund: number;
};

/**
 * Checkout totals: coupon applies to replacement surcharges only; shipping is added at full price after the discount.
 */
export function computeCheckoutTotals(input: CheckoutTotalsInput): CheckoutTotalsResult {
  const replacePaySubtotal = Math.max(0, input.replacePaySubtotal);
  const shippingFee = Math.max(0, input.shippingFee);
  const refundTotal = Math.max(0, input.refundTotal);
  const couponDiscountIls = couponDiscountIlsFromPercent(
    replacePaySubtotal,
    input.couponDiscountPercent ?? 0
  );
  const replacePayAfterCoupon = roundIls(Math.max(0, replacePaySubtotal - couponDiscountIls));
  const netPay = Math.max(0, replacePayAfterCoupon + shippingFee - refundTotal);
  const netRefund = Math.max(0, refundTotal - replacePayAfterCoupon - shippingFee);
  return {
    replacePaySubtotal,
    couponDiscountIls,
    replacePayAfterCoupon,
    shippingFee,
    refundTotal,
    netPay,
    netRefund,
  };
}
