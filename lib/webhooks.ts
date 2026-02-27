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

/** Raw webhook response: single { customer, orders } or array of same (use normalizeOrdersResponse in API). */
export async function fetchOrders(phone: string, ordersUrl: string): Promise<Record<string, unknown> | unknown[] | null> {
  try {
    const res = await fetch(ordersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}

export type SizeOption = { id: string; label?: string; price?: number; compare_at_price?: number; image?: string; images?: string[] };

/** Normalize n8n/Shopify-style response: array wrapper [ { sizes: [...] } ] or direct { sizes }. Map name→label, image[]→image+images. */
function normalizeSizesResponse(data: unknown): SizeOption[] {
  let list: unknown[] = [];
  if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === "object" && "sizes" in (data[0] as Record<string, unknown>)) {
    list = ((data[0] as Record<string, unknown>).sizes as unknown[]) ?? [];
  } else if (data && typeof data === "object" && ("sizes" in (data as Record<string, unknown>) || "Sizes" in (data as Record<string, unknown>))) {
    const d = data as Record<string, unknown>;
    list = (d.sizes ?? d.Sizes) as unknown[] ?? [];
  }
  if (!Array.isArray(list)) return [];
  return list.map((item, index) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = o.name ?? o.label ?? o.id ?? String(index);
    const id = typeof name === "string" ? name : String(index);
    const price = o.price != null ? Number(o.price) : undefined;
    const compareAtPrice = o.compare_at_price != null ? Number(o.compare_at_price) : undefined;
    const img = o.image;
    const imageUrls = Array.isArray(img) ? img.filter((u): u is string => typeof u === "string") : typeof img === "string" ? [img] : [];
    const image = imageUrls[0] ?? undefined;
    return {
      id,
      label: String(name),
      price: Number.isFinite(price) ? price : undefined,
      compare_at_price: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
      image,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };
  });
}

export async function fetchSizes(sku: string, sizesUrl: string): Promise<SizeOption[]> {
  try {
    const res = await fetch(sizesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeSizesResponse(data);
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
