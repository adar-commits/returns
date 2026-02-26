/**
 * Normalize Orders webhook response to app shape.
 * Accepts spec format: customer { custid, name, phone, address }, orders[] { ivdate, ivnum, receipt_link, Items[] { sku, partname, qty, price_amount } }.
 */

export function normalizeOrdersResponse(data: Record<string, unknown>): {
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
    : data.customerDetails ?? data.customer_details;

  const orders = ordersArray.map((o: Record<string, unknown>) => {
    const rawItems = o.Items ?? o.items ?? [];
    const itemsArray = Array.isArray(rawItems) ? rawItems : [];
    const items = itemsArray.map((it: Record<string, unknown>) => ({
      sku: it.sku ?? "",
      product_name: it.partname ?? it.product_name,
      partname: it.partname ?? it.product_name,
      qty: it.qty ?? 1,
      price: it.price_amount ?? it.price,
      price_amount: it.price_amount ?? it.price,
    }));
    return {
      ...o,
      order_id: o.ivnum ?? o.order_id ?? o.id,
      id: o.ivnum ?? o.order_id ?? o.id,
      IVDATE: o.ivdate ?? o.IVDATE,
      ivdate: o.ivdate ?? o.IVDATE,
      IVNUM: o.ivnum ?? o.IVNUM,
      ivnum: o.ivnum ?? o.IVNUM,
      receipt_link: o.receipt_link ?? o.receipt_href ?? o.invoice_link,
      receipt_href: o.receipt_link ?? o.receipt_href ?? o.invoice_link,
      items: items,
      line_items: items,
      Items: items,
    };
  });

  return {
    orders,
    customerDetails: customerDetails as Record<string, unknown> | undefined,
  };
}
