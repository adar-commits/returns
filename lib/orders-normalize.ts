/**
 * Normalize Orders webhook response to app shape.
 * Accepts:
 * - Single object: { customer, orders }
 * - Array of objects: [ { customer, orders }, ... ] (flattens to one customer + all orders)
 * Only orders with total_price > 0 are included (credit notes excluded from "my orders").
 */

import { normalizeCustId } from "@/lib/customer-id";

function coerceReturnable(v: unknown): boolean | undefined {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "string") {
    const lower = v.toLowerCase();
    if (lower === "true" || v === "1") return true;
    if (lower === "false" || v === "0") return false;
  }
  return undefined;
}

function normalizeSinglePayload(data: Record<string, unknown>): {
  orders: Array<Record<string, unknown>>;
  customerDetails?: Record<string, unknown>;
} {
  const rawOrders = data.orders ?? data.Orders ?? [];
  const ordersArray = Array.isArray(rawOrders) ? rawOrders : [];
  const customer = data.customer ?? data.Customer;
  const customerRecord = customer as Record<string, unknown> | undefined;
  const customerCustId = normalizeCustId(customerRecord);
  const customerDetails = customerRecord
    ? {
        cust_id: customerCustId ?? undefined,
        custid: customerCustId ?? undefined,
        name: customerRecord.name,
        full_name: customerRecord.name ?? customerRecord.full_name,
        phone: customerRecord.phone,
        address: customerRecord.address,
        city: customerRecord.city,
        street: customerRecord.street,
        house_number: customerRecord.house_number,
        floor: customerRecord.floor,
        apartment: customerRecord.apartment,
      }
    : (() => {
        const details = (data.customerDetails ?? data.customer_details) as Record<string, unknown> | undefined;
        if (!details) return undefined;
        const id = normalizeCustId(details);
        return {
          ...details,
          ...(id ? { cust_id: id, custid: id } : {}),
        };
      })();

  const orders = ordersArray
    .filter((o: Record<string, unknown>) => {
      const total = o.total_price ?? o.total;
      const n = typeof total === "number" ? total : Number(total);
      return n > 0;
    })
    .map((o: Record<string, unknown>) => {
      const rawItems = o.Items ?? o.items ?? [];
      const itemsArray = Array.isArray(rawItems) ? rawItems : [];
      const items = itemsArray.map((it: Record<string, unknown>) => {
        const amt = it.price_amount ?? it.price;
        const num = typeof amt === "number" ? amt : Number(amt);
        const price = Number.isFinite(num) ? Math.abs(num) : 0;
        return {
          sku: String(it.sku ?? it.SKU ?? it.partname ?? it.PARTNAME ?? it.PARTDES ?? it.partdes ?? "").trim(),
          product_name: it.partname ?? it.PARTDES ?? it.partdes ?? it.product_name,
          partname: it.partname ?? it.product_name,
          qty: Math.abs(Number(it.qty) || 1),
          price,
          price_amount: price,
          product_url: it.product_url ?? it.url ?? it.link ?? it.product_link ?? it.href,
          image_url: it.image_url ?? it.image ?? it.thumbnail ?? it.Image,
        };
      });
      return {
        ...o,
        order_id: o.ivnum ?? o.order_id ?? o.id,
        id: o.ivnum ?? o.order_id ?? o.id,
        cust_id: normalizeCustId(o) ?? undefined,
        custid: normalizeCustId(o) ?? undefined,
        IVDATE: o.ivdate ?? o.IVDATE,
        ivdate: o.ivdate ?? o.IVDATE,
        IVNUM: o.ivnum ?? o.IVNUM,
        ivnum: o.ivnum ?? o.IVNUM,
        status: o.status ?? o.STATUS ?? o.order_status,
        daysPassed: o.daysPassed ?? o.days_passed,
        isReturnable: coerceReturnable(o.isReturnable ?? o.is_returnable ?? o.returnable ?? o.Returnable),
        receipt_link: o.receipt_link ?? o.receipt_href ?? o.invoice_link,
        receipt_href: o.receipt_link ?? o.receipt_href ?? o.invoice_link,
        items,
        line_items: items,
        Items: items,
      };
    });

  return {
    orders,
    customerDetails,
  };
}

/**
 * Unwrap n8n/common webhook wrappers so we get { customer, orders } or array of same.
 * If the payload is { body: { ... } }, { data: { ... } }, etc., use the inner payload.
 */
function unwrapOrdersPayload(data: Record<string, unknown> | unknown[]): Record<string, unknown> | unknown[] {
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  const inner = d.body ?? d.data ?? d.result ?? d.output ?? d.json;
  if (inner != null && typeof inner === "object") return inner as Record<string, unknown> | unknown[];
  return data;
}

export function normalizeOrdersResponse(data: Record<string, unknown> | unknown[]): {
  orders: Array<Record<string, unknown>>;
  customerDetails?: Record<string, unknown>;
} {
  const unwrapped = unwrapOrdersPayload(data);
  if (Array.isArray(unwrapped) && unwrapped.length > 0) {
    const first = unwrapped[0] as Record<string, unknown>;
    const customer = first.customer ?? first.Customer;
    const allOrders = unwrapped.flatMap((e: unknown) => {
      const r = e as Record<string, unknown>;
      const list = r.orders ?? r.Orders ?? [];
      return Array.isArray(list) ? list : [];
    });
    return normalizeSinglePayload({ customer, orders: allOrders });
  }
  return normalizeSinglePayload(unwrapped as Record<string, unknown>);
}
