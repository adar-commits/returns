type OrderLine = {
  sku?: string;
  product_name?: string;
  partname?: string;
  price?: number | string;
  qty?: number | string;
};

export type WizardItemChoice = {
  sku: string;
  action: "" | "return" | "replace" | "keep" | "unsure";
  reason_id?: string;
  reason_text?: string;
  selected_size_id?: string;
  size_label?: string;
  size_price?: number;
};

const ACTION_LABEL_HE: Record<string, string> = {
  return: "החזרת מוצר",
  replace: "החלפת מידה",
  keep: "ללא שינוי",
  unsure: "איני בטוח/ה - זקוק/ה לסיוע טלפוני",
};

export function choicesWithReturnOrReplace(choices: WizardItemChoice[]): WizardItemChoice[] {
  return choices.filter((c) => c.action === "return" || c.action === "replace");
}

export function choicesForPayload(choices: WizardItemChoice[]): Array<WizardItemChoice & { action: Exclude<WizardItemChoice["action"], ""> }> {
  return choices.filter(
    (c): c is WizardItemChoice & { action: Exclude<WizardItemChoice["action"], ""> } =>
      c.action !== ""
  );
}

export function buildItemsDetailFromChoices(
  choices: WizardItemChoice[],
  orderItems: OrderLine[],
  returnReasons: string[]
) {
  return choicesForPayload(choices).map((c) => {
    const orderItem = orderItems.find((i) => i.sku === c.sku);
    const productName = orderItem?.product_name || orderItem?.partname || c.sku || "פריט";
    const paidPrice = Number(orderItem?.price ?? 0);
    const qty = Math.max(1, Number(orderItem?.qty ?? 1) || 1);
    const newPrice =
      c.action === "replace"
        ? c.size_price != null
          ? Number(c.size_price)
          : paidPrice
        : null;
    const priceDiff =
      c.action === "return"
        ? -paidPrice
        : c.action === "replace" && newPrice != null
          ? newPrice - paidPrice
          : 0;
    const isOtherReason = c.reason_id != null && returnReasons[Number(c.reason_id)] === "אחר";
    const reasonText =
      c.action === "return"
        ? isOtherReason && c.reason_text?.trim()
          ? c.reason_text.trim()
          : c.reason_id != null && returnReasons[Number(c.reason_id)] != null
            ? returnReasons[Number(c.reason_id)]
            : null
        : null;

    return {
      sku: c.sku,
      product_name: productName,
      qty,
      action_type: c.action,
      action_label_he: ACTION_LABEL_HE[c.action] ?? c.action,
      paid_price: paidPrice,
      new_size_id: c.action === "replace" ? c.selected_size_id || null : null,
      new_size_label: c.action === "replace" ? c.size_label || null : null,
      new_size_price: c.action === "replace" ? newPrice : null,
      price_diff: priceDiff,
      reason_id: c.action === "return" ? c.reason_id || null : null,
      reason_text: reasonText,
    };
  });
}

export function shippingMethodLabelHe(method: string): string {
  if (method === "courier") return "שליח עד הבית";
  if (method === "branch") return "החזרה לסניף";
  if (method === "callback") return "בקשה לנציג טלפוני";
  return method;
}

export function resolveRequestIntent(
  choices: WizardItemChoice[],
  hasReturn: boolean,
  hasReplace: boolean
): "return_or_replace" | "phone_consultation" | "no_change" {
  if (hasReturn || hasReplace) return "return_or_replace";
  if (choices.some((c) => c.action === "unsure")) return "phone_consultation";
  return "no_change";
}
