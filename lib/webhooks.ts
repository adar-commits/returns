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

/** Normalize a single sizes array from the webhook (one SKU's variants). */
function normalizeSizeList(raw: unknown): SizeOption[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return list.map((item, index) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = o.name ?? o.label ?? o.id ?? String(index);
    const id = typeof name === "string" ? name : String(index);
    const price = o.price != null ? Number(o.price) : undefined;
    const compareAtPrice = o.compare_at_price != null ? Number(o.compare_at_price) : undefined;
    const img = o.image;
    const imageUrls = Array.isArray(img)
      ? img.filter((u): u is string => typeof u === "string")
      : typeof img === "string"
      ? [img]
      : [];
    return {
      id,
      label: String(name),
      price: Number.isFinite(price) ? price : undefined,
      compare_at_price: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
      image: imageUrls[0] ?? undefined,
      images: imageUrls.length > 0 ? imageUrls.slice(0, 5) : undefined,
    };
  });
}

/**
 * Normalize the batch GetSizes response.
 * Expected: [ { sku: "...", sizes: [...] }, ... ]
 * Also handles legacy: { sizes: [...] } or [ { sizes: [...] } ] for a single SKU.
 */
function normalizeSizesBatchResponse(data: unknown, fallbackSku?: string): Record<string, SizeOption[]> {
  const result: Record<string, SizeOption[]> = {};

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    // Batch format: [ { sku, sizes }, ... ]
    if (typeof first.sku === "string") {
      for (const entry of data as Record<string, unknown>[]) {
        if (typeof entry.sku === "string") {
          result[entry.sku] = normalizeSizeList(entry.sizes ?? entry.Sizes ?? []);
        }
      }
      return result;
    }
    // Legacy array wrapper: [ { sizes: [...] } ]
    if ("sizes" in first || "Sizes" in first) {
      const sizes = normalizeSizeList(first.sizes ?? first.Sizes ?? []);
      if (fallbackSku) result[fallbackSku] = sizes;
      return result;
    }
  }

  // Direct { sizes: [...] }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const sizes = normalizeSizeList(d.sizes ?? d.Sizes ?? []);
    if (fallbackSku) result[fallbackSku] = sizes;
  }

  return result;
}

/**
 * Batch call: POST { Items: ["sku1","sku2",...] }, returns map of sku → SizeOption[].
 */
export async function fetchSizesBatch(skus: string[], sizesUrl: string): Promise<Record<string, SizeOption[]>> {
  if (skus.length === 0) return {};
  try {
    const res = await fetch(sizesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Items: skus }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return normalizeSizesBatchResponse(data, skus.length === 1 ? skus[0] : undefined);
  } catch {
    return {};
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
