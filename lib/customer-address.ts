import { normalizeOrdersResponse } from "@/lib/orders-normalize";
import { fetchOrders } from "@/lib/webhooks";

export type CustomerAddressPayload = {
  full_name: string;
  phone: string;
  address: string;
  city?: string;
  street?: string;
  house_number?: string;
  floor?: string;
  apartment?: string;
  courier_notes?: string;
  notes?: string;
  email?: string;
};

export type PickupAddressParts = {
  city?: string;
  street?: string;
  house_number?: string;
  floor?: string;
  apartment?: string;
};

function asTrimmedString(value: unknown): string {
  return value != null ? String(value).trim() : "";
}

/** Pickup address is only needed for home courier — not branch return or phone callback. */
export function isCourierPickupShipping(type: string | undefined | null): boolean {
  return type === "delivery" || type === "courier";
}

/** Compose a single pickup-address line for webhooks / legacy `address`. */
export function composePickupAddress(parts: PickupAddressParts): string {
  const streetLine = [asTrimmedString(parts.street), asTrimmedString(parts.house_number)]
    .filter(Boolean)
    .join(" ");
  const extras: string[] = [];
  const floor = asTrimmedString(parts.floor);
  const apartment = asTrimmedString(parts.apartment);
  if (floor) extras.push(`קומה ${floor}`);
  if (apartment) extras.push(`דירה ${apartment}`);
  const city = asTrimmedString(parts.city);
  return [streetLine, ...extras, city].filter(Boolean).join(", ");
}

function structuredFromRecord(src: Record<string, unknown> | Record<string, string>) {
  const city = asTrimmedString(src.city);
  const street = asTrimmedString(src.street);
  const house_number = asTrimmedString(src.house_number);
  const floor = asTrimmedString(src.floor);
  const apartment = asTrimmedString(src.apartment);
  const courier_notes = asTrimmedString(src.courier_notes ?? src.notes);
  return { city, street, house_number, floor, apartment, courier_notes };
}

function withStructuredFields(
  base: CustomerAddressPayload,
  parts: ReturnType<typeof structuredFromRecord>
): CustomerAddressPayload {
  return {
    ...base,
    ...(parts.city ? { city: parts.city } : {}),
    ...(parts.street ? { street: parts.street } : {}),
    ...(parts.house_number ? { house_number: parts.house_number } : {}),
    ...(parts.floor ? { floor: parts.floor } : {}),
    ...(parts.apartment ? { apartment: parts.apartment } : {}),
    ...(parts.courier_notes ? { courier_notes: parts.courier_notes, notes: parts.courier_notes } : {}),
  };
}

/** Map orders webhook customerDetails to HoM / return-request address shape. */
export function customerDetailsToAddress(
  details: Record<string, unknown> | undefined,
  fallbackPhone: string
): CustomerAddressPayload | null {
  if (!details) return null;
  const full_name = asTrimmedString(details.full_name ?? details.name);
  const phone = asTrimmedString(details.phone) || fallbackPhone;
  const parts = structuredFromRecord(details);
  const address = composePickupAddress(parts) || asTrimmedString(details.address);
  const email = asTrimmedString(details.email);

  if (!address && !full_name) return null;

  return withStructuredFields(
    {
      full_name: full_name || "לקוח",
      phone,
      address: address || "לא צוין",
      ...(email ? { email } : {}),
    },
    parts
  );
}

export function mergeCustomerAddress(
  submitted: Record<string, string> | undefined,
  fallback: CustomerAddressPayload | null,
  sessionPhone: string
): CustomerAddressPayload | null {
  if (submitted) {
    const full_name = asTrimmedString(submitted.full_name);
    const phone = asTrimmedString(submitted.phone) || sessionPhone;
    const parts = structuredFromRecord(submitted);
    const composed = composePickupAddress(parts);
    const legacyAddress = asTrimmedString(submitted.address);
    const address = composed || legacyAddress;
    const hasStructured = Boolean(parts.city && parts.street);
    const hasLegacy = Boolean(legacyAddress);

    if (full_name && phone && (hasStructured || hasLegacy)) {
      return withStructuredFields(
        {
          full_name,
          phone,
          address,
          ...(asTrimmedString(submitted.email) ? { email: asTrimmedString(submitted.email) } : {}),
        },
        parts
      );
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
