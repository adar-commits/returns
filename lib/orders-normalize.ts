/**
 * Normalize Orders webhook response to app shape.
 * Accepts:
 * - Single object: { customer, orders }
 * - Array of objects: [ { customer, orders }, ... ] (flattens to one customer + all orders)
 * Only orders with total_price > 0 are included (credit notes excluded from "my orders").
 */

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
  const customerDetails = customer
    ? {
        custid: (customer as Record<string, unknown>).custid,
        name: (customer as Record<string, unknown>).name,
        full_name: (customer as Record<string, unknown>).name ?? (customer as Record<string, unknown>).full_name,
        phone: (customer as Record<string, unknown>).phone,
        address: (customer as Record<string, unknown>).address,
      }
    : (data.customerDetails ?? data.customer_details) as Record<string, unknown> | undefined;

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
          sku: it.sku ?? it.partname ?? it.PARTNAME ?? it.PARTDES ?? it.partdes ?? "",
          product_name: it.partname ?? it.PARTDES ?? it.partdes ?? it.product_name,
          partname: it.partname ?? it.product_name,
          qty: Math.abs(Number(it.qty) || 1),
          price,
          price_amount: price,
        };
      });
      return {
        ...o,
        order_id: o.ivnum ?? o.order_id ?? o.id,
        id: o.ivnum ?? o.order_id ?? o.id,
        IVDATE: o.ivdate ?? o.IVDATE,
        ivdate: o.ivdate ?? o.IVDATE,
        IVNUM: o.ivnum ?? o.IVNUM,
        ivnum: o.ivnum ?? o.IVNUM,
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

export function normalizeOrdersResponse(data: Record<string, unknown> | unknown[]): {
  orders: Array<Record<string, unknown>>;
  customerDetails?: Record<string, unknown>;
} {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    const customer = first.customer ?? first.Customer;
    const allOrders = data.flatMap((e: unknown) => {
      const r = e as Record<string, unknown>;
      const list = r.orders ?? r.Orders ?? [];
      return Array.isArray(list) ? list : [];
    });
    return normalizeSinglePayload({ customer, orders: allOrders });
  }
  return normalizeSinglePayload(data as Record<string, unknown>);
}
