import { DEFAULT_COUPON_WEBHOOK_URL } from "@/lib/constants";

export type CouponWebhookResult = { isValid: boolean; discount: string };

/**
 * POST { coupon } to n8n; returns null on network/parse failure.
 * `discount` is a percentage (e.g. "10" = 10%) off replacement **product prices** (not surcharges, not shipping).
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

export type ReplaceLineInput = {
  paidPrice: number;
  newPrice: number;
};

/** Apply coupon percent to a replacement product catalog price (before subtracting paid amount). */
export function discountedProductPrice(newPrice: number, discountPercent: number): number {
  if (newPrice <= 0) return 0;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return roundIls(newPrice);
  return roundIls(newPrice * (1 - discountPercent / 100));
}

export type ReplaceLineAmounts = {
  /** Sum of replacement product prices (before coupon). */
  replaceProductsSubtotal: number;
  couponDiscountIls: number;
  /** Sum of replacement product prices after coupon. */
  replaceProductsAfterDiscount: number;
  /** Sum of paid amounts on replacement lines (for display). */
  replacePaidSubtotal: number;
  /** Sum of positive (new − paid) diffs without coupon — legacy display. */
  replaceDiffSubtotal: number;
  /** Amount due for replacement products: Σ max(0, discountedNew − paid). */
  replacePayDue: number;
  /** Credit when discounted price is below paid: Σ max(0, paid − discountedNew). */
  replaceCredit: number;
};

export function computeReplaceLineAmounts(
  lines: ReplaceLineInput[],
  couponDiscountPercent = 0
): ReplaceLineAmounts {
  let replaceProductsSubtotal = 0;
  let couponDiscountIls = 0;
  let replaceProductsAfterDiscount = 0;
  let replacePaidSubtotal = 0;
  let replaceDiffSubtotal = 0;
  let replacePayDue = 0;
  let replaceCredit = 0;

  for (const { paidPrice, newPrice } of lines) {
    const paid = Math.max(0, paidPrice);
    const listPrice = Math.max(0, newPrice);
    replaceProductsSubtotal += listPrice;
    replacePaidSubtotal += paid;

    const diff = listPrice - paid;
    if (diff > 0) replaceDiffSubtotal += diff;

    const discountedNew = discountedProductPrice(listPrice, couponDiscountPercent);
    replaceProductsAfterDiscount += discountedNew;
    couponDiscountIls += Math.max(0, roundIls(listPrice - discountedNew));

    const due = roundIls(discountedNew - paid);
    if (due > 0) replacePayDue += due;
    else if (due < 0) replaceCredit += -due;
  }

  return {
    replaceProductsSubtotal: roundIls(replaceProductsSubtotal),
    couponDiscountIls: roundIls(couponDiscountIls),
    replaceProductsAfterDiscount: roundIls(replaceProductsAfterDiscount),
    replacePaidSubtotal: roundIls(replacePaidSubtotal),
    replaceDiffSubtotal: roundIls(replaceDiffSubtotal),
    replacePayDue: roundIls(replacePayDue),
    replaceCredit: roundIls(replaceCredit),
  };
}

export type CheckoutTotalsInput = {
  replaceLines: ReplaceLineInput[];
  /** Refunds from pure returns (paid price of returned items). */
  returnRefund: number;
  shippingFee: number;
  couponDiscountPercent?: number;
};

export type CheckoutTotalsResult = ReplaceLineAmounts & {
  returnRefund: number;
  shippingFee: number;
  netPay: number;
  netRefund: number;
};

/**
 * Coupon applies to replacement product prices; customer pays max(0, discountedPrice − paid).
 * Shipping is added at full price after product amounts. Returns reduce the balance separately.
 */
export function computeCheckoutTotals(input: CheckoutTotalsInput): CheckoutTotalsResult {
  const shippingFee = Math.max(0, input.shippingFee);
  const returnRefund = Math.max(0, input.returnRefund);
  const replace = computeReplaceLineAmounts(input.replaceLines, input.couponDiscountPercent ?? 0);
  const totalCredit = roundIls(returnRefund + replace.replaceCredit);
  const netPay = Math.max(0, replace.replacePayDue + shippingFee - totalCredit);
  const netRefund = Math.max(0, totalCredit - replace.replacePayDue - shippingFee);

  return {
    ...replace,
    returnRefund,
    shippingFee,
    netPay,
    netRefund,
  };
}
