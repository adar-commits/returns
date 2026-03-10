/**
 * Delivery fee for "שליח עד הבית" based on LABS_CSQR (sq meters) and product name.
 * Calculated only from returned/replaced products (original items); new size is not used.
 *
 * Ranges (edit in deliveryFeeForProduct if you change these):
 * - Product name contains "פוף" → 99 ILS
 * - LABS_CSQR:  x ≤ 0 or missing → 85  |  0 < x ≤ 3.8 → 85  |  3.8 < x ≤ 5.8 → 100  |  5.8 < x ≤ 8.16 → 150  |  x > 8.16 → 300
 *
 * Multiple items: highest fee + 50% of the sum of the other fees.
 */
const DELIVERY_FEE_RANGES = [
  { max: 0, fee: 85 },
  { max: 3.8, fee: 85 },
  { max: 5.8, fee: 100 },
  { max: 8.16, fee: 150 },
  { max: Infinity, fee: 300 },
];

export function deliveryFeeForProduct(productName: string, labsCsqr: number | null | undefined): number {
  const name = String(productName ?? "").trim();
  if (name.includes("פוף")) return 99;

  const sq = labsCsqr != null ? Number(labsCsqr) : 0;
  for (const { max, fee } of DELIVERY_FEE_RANGES) {
    if (sq <= max) return fee;
  }
  return 300;
}

/**
 * Total delivery fee for multiple products: highest single fee + 50% of each other fee.
 */
export function totalDeliveryFee(
  items: Array<{ productName: string; labsCsqr: number | null | undefined }>
): number {
  if (items.length === 0) return 85; // default
  const fees = items.map((it) => deliveryFeeForProduct(it.productName, it.labsCsqr));
  if (fees.length === 1) return fees[0];
  const maxFee = Math.max(...fees);
  const restSum = fees.reduce((a, b) => a + b, 0) - maxFee;
  return Math.round((maxFee + 0.5 * restSum) * 100) / 100;
}
