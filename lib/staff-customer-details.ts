/**
 * Merge customer-facing fields from DB `customer_address` and `webhook_payload`
 * for staff detail "פרטי לקוח".
 */

const FIELD_LABELS_HE: Record<string, string> = {
  full_name: "שם מלא",
  first_name: "שם פרטי",
  last_name: "שם משפחה",
  name: "שם",
  phone: "טלפון",
  phone_account: "טלפון (מזהה בקשה)",
  mobile: "נייד",
  tel: "טלפון",
  email: "דוא״ל",
  address: "כתובת",
  street: "רחוב",
  house_number: "מס׳ בית",
  city: "עיר",
  zip: "מיקוד",
  postal_code: "מיקוד",
  notes: "הערות",
  apartment: "דירה",
  unit: "יחידה",
  floor: "קומה",
  entrance: "כניסה",
  building: "בניין",
  company: "חברה",
  vat_id: "ח.פ. / עוסק מורשה",
  country: "ארץ",
  region: "אזור",
};

/** Prefer this order; unknown keys follow, sorted by label key. */
const FIELD_ORDER: string[] = [
  "full_name",
  "name",
  "first_name",
  "last_name",
  "phone",
  "phone_account",
  "mobile",
  "tel",
  "email",
  "address",
  "street",
  "house_number",
  "city",
  "zip",
  "postal_code",
  "country",
  "region",
  "apartment",
  "floor",
  "entrance",
  "building",
  "unit",
  "notes",
  "company",
  "vat_id",
];

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function mergeCustomerSources(
  customerAddress: unknown,
  payload: Record<string, unknown> | null
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const addr = asRecord(customerAddress);
  const customer = asRecord(payload?.customer);
  const shipping = asRecord(payload?.shipping);
  const delivery = shipping ? asRecord(shipping.customer_delivery_address) : null;

  const sources = [addr, customer, delivery].filter(Boolean) as Record<string, unknown>[];
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "object" && !Array.isArray(v)) continue;
      if (Array.isArray(v)) continue;
      const str = typeof v === "string" ? v.trim() : String(v).trim();
      if (!str) continue;
      if (merged[k] === undefined || merged[k] === null || merged[k] === "") {
        merged[k] = str;
      }
    }
  }
  return merged;
}

function labelForKey(key: string): string {
  return FIELD_LABELS_HE[key] ?? key.replace(/_/g, " ");
}

export type StaffCustomerDetailRow = { key: string; label: string; value: string };

/**
 * All primitive string/number fields from merged customer sources, de-duplicated,
 * plus request `phone` when not already equal to merged phone.
 */
export function buildStaffCustomerDetailRows(params: {
  phone: string;
  customer_address: unknown;
  webhook_payload: Record<string, unknown> | null;
}): StaffCustomerDetailRow[] {
  const merged = mergeCustomerSources(params.customer_address, params.webhook_payload);
  const accountPhone = params.phone?.trim() ?? "";
  const mergedPhone = typeof merged.phone === "string" ? merged.phone.trim() : "";

  if (accountPhone) {
    if (!mergedPhone) {
      merged.phone = accountPhone;
    } else if (mergedPhone !== accountPhone) {
      merged.phone_account = accountPhone;
    }
  }

  const entries = Object.entries(merged).filter(([, v]) => v != null && String(v).trim() !== "");
  const orderIndex = new Map(FIELD_ORDER.map((k, i) => [k, i]));

  entries.sort((a, b) => {
    const ia = orderIndex.get(a[0]);
    const ib = orderIndex.get(b[0]);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return labelForKey(a[0]).localeCompare(labelForKey(b[0]), "he");
  });

  const seen = new Set<string>();
  const rows: StaffCustomerDetailRow[] = [];
  for (const [key, value] of entries) {
    const valueStr = typeof value === "string" ? value.trim() : String(value).trim();
    if (!valueStr) continue;
    const dedupe = `${key}:${valueStr}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const label = labelForKey(key);
    rows.push({ key, label, value: valueStr });
  }
  return rows;
}
