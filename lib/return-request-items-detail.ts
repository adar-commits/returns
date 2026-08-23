import { ENABLE_SIZE_EXCHANGE, RETURNS_ONLY_RETURN_REASONS } from "@/lib/constants";

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
  return_reason?: string;
  return_reason_label?: string;
  reason?: string;
  reason_label?: string;
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

/** Same reason list the customer saw on item selection. */
export function customerReturnReasons(settingsReasons: string[] | undefined): string[] {
  if (!ENABLE_SIZE_EXCHANGE) return [...RETURNS_ONLY_RETURN_REASONS];
  return Array.isArray(settingsReasons) ? settingsReasons : [];
}

export function resolveCancellationReason(
  choice: WizardItemChoice,
  returnReasons: string[]
): { return_reason: string; return_reason_label: string } | null {
  if (choice.action === "keep" || choice.action === "unsure") {
    const label = ACTION_LABEL_HE[choice.action];
    return { return_reason: label, return_reason_label: label };
  }

  if (choice.action === "replace") {
    const existing =
      [choice.return_reason_label, choice.return_reason, choice.reason_label, choice.reason]
        .map((v) => (v != null ? String(v).trim() : ""))
        .find(Boolean);
    const label = existing || ACTION_LABEL_HE.replace;
    return { return_reason: choice.return_reason?.trim() || "replace", return_reason_label: label };
  }

  if (choice.action !== "return" && String(choice.action) !== "refund") return null;

  const idx =
    choice.reason_id != null && String(choice.reason_id).trim() !== ""
      ? Number(choice.reason_id)
      : NaN;
  const fromList = Number.isInteger(idx) ? returnReasons[idx] : undefined;
  const custom = choice.reason_text?.trim() || "";
  const label =
    (fromList === "אחר" && custom ? custom : "") ||
    fromList ||
    custom ||
    [choice.return_reason_label, choice.return_reason, choice.reason_label, choice.reason]
      .map((v) => (v != null ? String(v).trim() : ""))
      .find(Boolean) ||
    "";
  if (!label) return null;

  return {
    return_reason: label,
    return_reason_label: label,
  };
}

/** Landbot reads wizard.choices[] return_reason / return_reason_label / reason / reason_label. */
export function enrichChoicesWithCancellationReasons(
  choices: WizardItemChoice[],
  returnReasons: string[]
): WizardItemChoice[] {
  return choices.map((c) => {
    const resolved = resolveCancellationReason(c, returnReasons);
    if (!resolved) return { ...c };
    return {
      ...c,
      return_reason: resolved.return_reason,
      return_reason_label: resolved.return_reason_label,
      reason: resolved.return_reason,
      reason_label: resolved.return_reason_label,
    };
  });
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
    const cancellation = resolveCancellationReason(c, returnReasons);
    const reasonText = cancellation?.return_reason_label ?? null;

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
      reason_id: c.action === "return" || c.action === "replace" ? c.reason_id || null : null,
      reason_text: reasonText,
      return_reason: cancellation?.return_reason ?? null,
      return_reason_label: cancellation?.return_reason_label ?? null,
      reason: cancellation?.return_reason ?? null,
      reason_label: cancellation?.return_reason_label ?? null,
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
