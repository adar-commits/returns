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
 */
export function couponDiscountIlsFromPercent(replacePaySubtotal: number, discountPercent: number): number {
  if (replacePaySubtotal <= 0 || !Number.isFinite(discountPercent) || discountPercent <= 0) return 0;
  return roundIls((replacePaySubtotal * discountPercent) / 100);
}
