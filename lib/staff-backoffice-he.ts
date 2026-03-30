export const RETURN_STATUS_HE: Record<string, string> = {
  pending_approval: "ממתין לאישור",
  awaiting_confirm: "ממתין לאישור",
  awaiting_payment: "ממתין לתשלום",
  confirmed: "אושר",
  pickup_awaiting: "ממתין לאיסוף",
  received: "התקבל",
  refunded: "זוכה",
  shipped: "נשלח",
  in_transit: "במשלוח",
  delivered: "נמסר",
};

export const RETURN_TYPE_HE: Record<string, string> = {
  return: "החזרה",
  replacement: "החלפה",
  mixed: "מעורב",
};

export const STAFF_HANDLING_HE: Record<string, string> = {
  in_progress: "בטיפול",
  completed: "טיפול הושלם",
};

export function formatIls(n: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(
    n
  );
}

export function formatIlsDetailed(n: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2 }).format(n);
}
