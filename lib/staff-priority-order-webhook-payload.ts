import { parseInternalNotesLog } from "@/lib/internal-notes-log";
import { RETURN_STATUS_HE, RETURN_TYPE_HE, STAFF_HANDLING_HE } from "@/lib/staff-backoffice-he";

/** Full row shape from staff detail fetch (augmented webhook_payload). */
export type StaffDetailRowForWebhook = {
  id: string;
  return_id: string;
  reference_code: string;
  order_id: string;
  phone: string;
  branch_id: string | null;
  status: string;
  staff_handling: string | null;
  type: string;
  items: unknown;
  amount_refund: number;
  amount_to_pay: number;
  shipping_fee: number;
  payplus_payment_id: string | null;
  payment_status: string | null;
  replacement_order_id: string | null;
  customer_address: unknown;
  webhook_payload: Record<string, unknown> | null;
  internal_notes_log: unknown;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
  updated_by_display_name: string | null;
};

/**
 * JSON-serializable payload for external Priority / n8n automation — all stored
 * request fields plus parsed notes, Hebrew labels, and computed totals.
 */
export function buildPriorityOrderWebhookPayload(row: StaffDetailRowForWebhook): Record<string, unknown> {
  const amountToPay = Number(row.amount_to_pay);
  const shippingFee = Number(row.shipping_fee);
  const amountRefund = Number(row.amount_refund);
  const totalChargeDue = Math.max(0, amountToPay + shippingFee - amountRefund);

  return {
    return_id: row.return_id,
    reference_code: row.reference_code,
    order_id: row.order_id,
    phone: row.phone,
    branch_id: row.branch_id,
    status: row.status,
    status_label_he: RETURN_STATUS_HE[row.status] ?? row.status,
    staff_handling: row.staff_handling,
    staff_handling_label_he: row.staff_handling
      ? STAFF_HANDLING_HE[row.staff_handling] ?? row.staff_handling
      : null,
    type: row.type,
    type_label_he: RETURN_TYPE_HE[row.type] ?? row.type,
    items: row.items,
    amount_refund: row.amount_refund,
    amount_to_pay: row.amount_to_pay,
    shipping_fee: row.shipping_fee,
    payplus_payment_id: row.payplus_payment_id,
    payment_status: row.payment_status,
    replacement_order_id: row.replacement_order_id,
    customer_address: row.customer_address,
    webhook_payload: row.webhook_payload,
    internal_notes_log: row.internal_notes_log,
    internal_notes_parsed: parseInternalNotesLog(row.internal_notes_log),
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by_user_id: row.updated_by_user_id,
    updated_by_display_name: row.updated_by_display_name,
    id: row.id,
    computed: {
      total_charge_due: totalChargeDue,
      amount_to_pay_num: amountToPay,
      shipping_fee_num: shippingFee,
      amount_refund_num: amountRefund,
    },
  };
}
