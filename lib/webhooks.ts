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

export type SizeOption = { id: string; label?: string; price?: number; compare_at_price?: number; image?: string; images?: string[]; labs_csqr?: number };

/** Normalize a single sizes array from the webhook (one SKU's variants). Per-size labs_csqr used for replace delivery fee. */
function normalizeSizeList(raw: unknown): SizeOption[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return list.map((item, index) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = o.name ?? o.label ?? o.id ?? String(index);
    const id = (typeof o.id === "string" && o.id.trim() ? o.id : typeof name === "string" ? name : String(index));
    const price = o.price != null ? Number(o.price) : undefined;
    const compareAtPrice = o.compare_at_price != null ? Number(o.compare_at_price) : undefined;
    const labsSq = o.labs_csqr ?? o.LABS_CSQR;
    const labsCsqr = labsSq != null && Number.isFinite(Number(labsSq)) ? Number(labsSq) : undefined;
    const img = o.image ?? o.Image;
    const imgList = o.images ?? o.Images;
    const imageUrls: string[] = Array.isArray(img)
      ? img.filter((u): u is string => typeof u === "string")
      : typeof img === "string"
      ? [img]
      : [];
    const extra = Array.isArray(imgList) ? imgList.filter((u): u is string => typeof u === "string") : [];
    const combined = imageUrls.length ? [...imageUrls] : [...extra];
    for (const u of extra) if (u && !combined.includes(u)) combined.push(u);
    return {
      id,
      label: String(name),
      price: Number.isFinite(price) ? price : undefined,
      compare_at_price: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
      image: combined[0] ?? undefined,
      images: combined.length > 0 ? combined.slice(0, 10) : undefined,
      labs_csqr: labsCsqr,
    };
  });
}

/**
 * Normalize the batch GetSizes response.
 * Expected: [ { sku: "...", LABS_CSQR?: number, sizes: [...] }, ... ] or wrapped in { data: [...] }.
 * Also handles legacy: { sizes: [...] } or [ { sizes: [...] } ] for a single SKU.
 * Returns both sizes map and LABS_CSQR per SKU (for delivery fee calculation).
 */
function normalizeSizesBatchResponse(
  data: unknown,
  fallbackSku?: string
): { result: Record<string, SizeOption[]>; labsCsqr: Record<string, number> } {
  const result: Record<string, SizeOption[]> = {};
  const labsCsqr: Record<string, number> = {};

  // Unwrap common gateway wrappers: { data: [...] }, { body: [...] }, etc.
  let arr: unknown[] | null = null;
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) arr = d.data as unknown[];
    else if (Array.isArray(d.body)) arr = d.body as unknown[];
    else if (Array.isArray(d.result)) arr = d.result as unknown[];
    else if (Array.isArray(d.output)) arr = d.output as unknown[];
    else if (Array.isArray(d.json)) arr = d.json as unknown[];
  }
  if (arr == null && Array.isArray(data)) arr = data;

  if (arr && arr.length > 0) {
    const first = arr[0] as Record<string, unknown>;
    // Batch format: [ { sku, LABS_CSQR?, sizes }, ... ]
    if (typeof first.sku === "string") {
      for (const entry of arr as Record<string, unknown>[]) {
        if (typeof entry.sku === "string") {
          result[entry.sku] = normalizeSizeList(entry.sizes ?? entry.Sizes ?? []);
          const sq = entry.LABS_CSQR ?? entry.labs_csqr;
          if (sq != null && Number.isFinite(Number(sq))) labsCsqr[entry.sku] = Number(sq);
        }
      }
      return { result, labsCsqr };
    }
    // Legacy array wrapper: [ { sizes: [...] } ]
    if ("sizes" in first || "Sizes" in first) {
      const sizes = normalizeSizeList(first.sizes ?? first.Sizes ?? []);
      if (fallbackSku) result[fallbackSku] = sizes;
      return { result, labsCsqr };
    }
  }

  // Direct { sizes: [...] }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const sizes = normalizeSizeList(d.sizes ?? d.Sizes ?? []);
    if (fallbackSku) result[fallbackSku] = sizes;
  }

  return { result, labsCsqr };
}

/**
 * Batch call: POST { Items: ["sku1","sku2",...] }, returns map of sku → SizeOption[] and labsCsqr per SKU.
 */
export async function fetchSizesBatch(
  skus: string[],
  sizesUrl: string
): Promise<{ results: Record<string, SizeOption[]>; labsCsqr: Record<string, number> }> {
  if (skus.length === 0) return { results: {}, labsCsqr: {} };
  try {
    const res = await fetch(sizesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Items: skus }),
    });
    if (!res.ok) return { results: {}, labsCsqr: {} };
    const data = await res.json();
    let { result: out, labsCsqr } = normalizeSizesBatchResponse(data, skus.length === 1 ? skus[0] : undefined);
    // Fallback: if webhook returns array in same order as Items, map by index when key is missing
    let arr: unknown[] | null = null;
    if (Array.isArray(data)) arr = data;
    else if (data != null && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.data)) arr = d.data as unknown[];
      else if (Array.isArray(d.body)) arr = d.body as unknown[];
      else if (Array.isArray(d.result)) arr = d.result as unknown[];
      else if (Array.isArray(d.output)) arr = d.output as unknown[];
      else if (Array.isArray(d.json)) arr = d.json as unknown[];
    }
    if (arr && arr.length > 0 && skus.length > 0) {
      const first = arr[0] as Record<string, unknown>;
      if (typeof first.sku === "string") {
        for (let i = 0; i < arr.length && i < skus.length; i++) {
          const entry = arr[i] as Record<string, unknown>;
          const key = typeof entry.sku === "string" ? entry.sku : skus[i];
          if (key && !out[key]?.length && entry.sizes != null) {
            out = { ...out, [key]: normalizeSizeList(entry.sizes ?? entry.Sizes ?? []) };
            const sq = entry.LABS_CSQR ?? entry.labs_csqr;
            if (sq != null && Number.isFinite(Number(sq))) labsCsqr[key] = Number(sq);
          }
        }
      } else if (("sizes" in first || "Sizes" in first) && arr.length >= skus.length) {
        // Batch [ { sizes: [...] }, ... ] without sku — map by index to requested skus
        for (let i = 0; i < skus.length; i++) {
          const entry = (arr[i] as Record<string, unknown>) ?? {};
          const list = entry.sizes ?? entry.Sizes ?? [];
          if (Array.isArray(list) && list.length > 0) {
            out = { ...out, [skus[i]]: normalizeSizeList(list) };
            const sq = entry.LABS_CSQR ?? entry.labs_csqr;
            if (sq != null && Number.isFinite(Number(sq))) labsCsqr[skus[i]] = Number(sq);
          }
        }
      }
    }
    return { results: out, labsCsqr };
  } catch {
    return { results: {}, labsCsqr: {} };
  }
}

export type Branch = {
  id: string;
  name: string;
  address?: string;
  state?: string;
  phone?: string;
  email?: string;
  map_url?: string;
  opening_hours?: string;
};

/** Normalise Priority OData shape [ { value: [...] } ] or direct { value } or { branches }. Also unwraps n8n-style { body: { branches } } or { body: [...] }. */
function normalizeBranchesResponse(data: unknown): Branch[] {
  let rows: Record<string, unknown>[] = [];

  // Unwrap common wrappers (e.g. n8n returns { body: { branches: [...] } } or { body: [...] })
  let unwrapped: unknown = data;
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (d.body != null) unwrapped = d.body;
    else if (d.data != null) unwrapped = d.data;
    else if (d.result != null) unwrapped = d.result;
    else if (d.output != null) unwrapped = d.output;
  }
  if (unwrapped != null && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
    const u = unwrapped as Record<string, unknown>;
    if (Array.isArray(u.branches)) rows = u.branches as Record<string, unknown>[];
    else if (Array.isArray(u.Branches)) rows = u.Branches as Record<string, unknown>[];
    else if (Array.isArray(u.value)) rows = u.value as Record<string, unknown>[];
  }

  if (rows.length === 0 && Array.isArray(unwrapped) && unwrapped.length > 0) {
    const first = unwrapped[0] as Record<string, unknown>;
    if ("value" in first && Array.isArray(first.value)) {
      rows = first.value as Record<string, unknown>[];
    } else if ("BRANCHNAME" in first || "id" in first || "branch_id" in first) {
      rows = unwrapped as Record<string, unknown>[];
    }
  } else if (rows.length === 0 && data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.value)) rows = d.value as Record<string, unknown>[];
    else if (Array.isArray(d.branches)) rows = d.branches as Record<string, unknown>[];
    else if (Array.isArray(d.Branches)) rows = d.Branches as Record<string, unknown>[];
  }

  return rows.map((r) => ({
    id: String(r.BRANCHNAME ?? r.id ?? r.branch_id ?? ""),
    name: String(r.BRANCHDES ?? r.name ?? r.branch_desc ?? r.BRANCHNAME ?? ""),
    address: (r.ADDRESS ?? r.address) != null ? String(r.ADDRESS ?? r.address) : undefined,
    state: (r.STATE ?? r.state) != null ? String(r.STATE ?? r.state) : undefined,
    phone: (r.PHONE ?? r.phone) != null ? String(r.PHONE ?? r.phone) : undefined,
    email: (r.EMAIL ?? r.email) != null ? String(r.EMAIL ?? r.email) : undefined,
    map_url: (r.map_url ?? r.waze_link) != null ? String(r.map_url ?? r.waze_link) : undefined,
    opening_hours: (r.opening_hours ?? r.OPENING_HOURS) != null ? String(r.opening_hours ?? r.OPENING_HOURS) : undefined,
  })).filter((b) => b.id);
}

export async function fetchBranches(branchesUrl: string): Promise<Branch[]> {
  try {
    const res = await fetch(branchesUrl, { method: "GET", next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeBranchesResponse(data);
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
