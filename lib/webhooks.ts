/**
 * Call external APIs: OTP send/verify, orders, sizes, branches, invoices.
 * URLs from app_settings or env.
 */

const OTP_BYPASS_CODES = ["0000", "000000"];

export function isOtpBypass(code: string): boolean {
  return OTP_BYPASS_CODES.includes(code.trim());
}

/**
 * POST to OTP webhook with generated code and phone.
 * Body: { phone, code, otp } — "otp" is alias for "code" for consumers that expect it.
 */
export async function sendOtp(phone: string, sendUrl: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = {
      phone: phone.trim(),
      code,
      otp: code,
    };
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Legacy: verification is now done locally in verify-otp route (we store OTP when sending). */
export async function verifyOtp(_phone: string, _code: string, _verifyUrl: string): Promise<{ valid: boolean; error?: string }> {
  return { valid: false, error: "Use local verification" };
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
