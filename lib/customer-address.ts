import { normalizeOrdersResponse } from "@/lib/orders-normalize";
import { fetchOrders } from "@/lib/webhooks";

export type CustomerAddressPayload = {
  full_name: string;
  phone: string;
  address: string;
  city?: string;
  email?: string;
};

function asTrimmedString(value: unknown): string {
  return value != null ? String(value).trim() : "";
}

/** Map orders webhook customerDetails to HoM / return-request address shape. */
export function customerDetailsToAddress(
  details: Record<string, unknown> | undefined,
  fallbackPhone: string
): CustomerAddressPayload | null {
  if (!details) return null;
  const full_name = asTrimmedString(details.full_name ?? details.name);
  const phone = asTrimmedString(details.phone) || fallbackPhone;
  const address = asTrimmedString(details.address);
  const city = asTrimmedString(details.city);
  const email = asTrimmedString(details.email);

  if (!address && !full_name) return null;

  return {
    full_name: full_name || "לקוח",
    phone,
    address: address || "לא צוין",
    ...(city ? { city } : {}),
    ...(email ? { email } : {}),
  };
}

export function mergeCustomerAddress(
  submitted: Record<string, string> | undefined,
  fallback: CustomerAddressPayload | null,
  sessionPhone: string
): CustomerAddressPayload | null {
  if (submitted) {
    const full_name = asTrimmedString(submitted.full_name);
    const phone = asTrimmedString(submitted.phone) || sessionPhone;
    const address = asTrimmedString(submitted.address);
    if (full_name && phone && address) {
      return {
        full_name,
        phone,
        address,
        ...(asTrimmedString(submitted.city) ? { city: asTrimmedString(submitted.city) } : {}),
        ...(asTrimmedString(submitted.email) ? { email: asTrimmedString(submitted.email) } : {}),
      };
    }
  }
  return fallback;
}

export async function fetchCustomerAddressFromOrders(
  phone: string,
  ordersUrl: string
): Promise<CustomerAddressPayload | null> {
  const raw = await fetchOrders(phone, ordersUrl);
  if (!raw) return null;
  const data = normalizeOrdersResponse(raw);
  return customerDetailsToAddress(data.customerDetails, phone);
}
