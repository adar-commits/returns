/** Normalize cust_id / custid / CUST_ID from webhook or order records. */
export function normalizeCustId(source: Record<string, unknown> | undefined | null): string | null {
  if (!source) return null;
  const raw = source.cust_id ?? source.custid ?? source.CUST_ID ?? source.CUSTID;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  return trimmed || null;
}

/** Prefer order-level cust_id, then customer-level from orders webhook. */
export function resolveCustId(
  order: Record<string, unknown> | undefined | null,
  customerDetails: Record<string, unknown> | undefined | null
): string | null {
  return normalizeCustId(order) ?? normalizeCustId(customerDetails);
}
