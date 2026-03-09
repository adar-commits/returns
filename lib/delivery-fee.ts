/**
 * Delivery fee for "שליח עד הבית" based on LABS_CSQR (sq meters) and product name.
 * Only returned products (items being picked up) count; same highest + 50% rest logic.
 * - If product name contains "פוף" → 99 ILS
 * - Otherwise by LABS_CSQR:
 *   0 < x ≤ 3.8 → 85 ILS
 *   3.8 < x ≤ 5.8 → 100 ILS
 *   5.8 < x ≤ 8.16 → 150 ILS
 *   x > 8.16 → 300 ILS
 * Multiple returned products: highest fee + 50% of the sum of the other fees.
 */

export function deliveryFeeForProduct(productName: string, labsCsqr: number | null | undefined): number {
  const name = String(productName ?? "").trim();
  if (name.includes("פוף")) return 99;

  const sq = labsCsqr != null ? Number(labsCsqr) : 0;
  if (sq <= 0) return 85;
  if (sq <= 3.8) return 85;
  if (sq <= 5.8) return 100;
  if (sq <= 8.16) return 150;
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
