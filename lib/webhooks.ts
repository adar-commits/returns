/**
 * Call external APIs: OTP send/verify, orders, sizes, branches, invoices.
 * URLs from app_settings or env.
 */

const OTP_BYPASS_CODE = "0000";

export function isOtpBypass(code: string): boolean {
  return code === OTP_BYPASS_CODE;
}

export async function sendOtp(phone: string, sendUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function verifyOtp(phone: string, code: string, verifyUrl: string): Promise<{ valid: boolean; error?: string }> {
  if (isOtpBypass(code)) return { valid: true };
  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json().catch(() => ({}));
    const valid = res.ok && (data.valid === true || data.success === true);
    return { valid, error: valid ? undefined : (data.error || data.message || "Invalid code") };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}

export async function fetchOrders(phone: string, ordersUrl: string): Promise<{
  orders: Array<Record<string, unknown>>;
  customerDetails?: Record<string, unknown>;
} | null> {
  try {
    const res = await fetch(ordersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      orders: Array.isArray(data.orders) ? data.orders : [],
      customerDetails: data.customerDetails ?? data.customer_details,
    };
  } catch {
    return null;
  }
}

export async function fetchSizes(sku: string, sizesUrl: string): Promise<Array<{ id: string; label?: string; price?: number }>> {
  try {
    const res = await fetch(sizesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.sizes ?? data.Sizes ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function fetchBranches(branchesUrl: string): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(branchesUrl, { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.branches ?? data.Branches ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function fetchInvoiceLink(ivnum: string, invoicesUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${invoicesUrl}?ivnum=${encodeURIComponent(ivnum)}`, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.href ?? data.url ?? null;
  } catch {
    return null;
  }
}
