export type ReturnRequestStatus =
  | "pending_approval"
  | "awaiting_confirm"
  | "awaiting_payment"
  | "confirmed"
  | "pickup_awaiting"
  | "received"
  | "refunded"
  | "shipped"
  | "in_transit"
  | "delivered";

export type ReturnRequestType = "return" | "replacement" | "mixed";

export type StaffHandlingStatus = "in_progress" | "completed";

export interface ShippingTier {
  min: number;
  max: number;
  fee: number;
}

export interface ContentHelpBanner {
  text: string;
  href: string;
}

export interface AppSettingsRow {
  id: string;
  eligibility_days: number;
  return_reasons: string[];
  shipping_tiers: ShippingTier[];
  otp_send_url: string | null;
  otp_verify_url: string | null;
  orders_webhook_url: string | null;
  sizes_webhook_url: string | null;
  branches_webhook_url: string | null;
  final_webhook_url: string | null;
  invoices_webhook_url: string | null;
  content_banner: unknown;
  content_footer: unknown;
  content_help_banner: ContentHelpBanner | null;
  content_headlines: Record<string, string> | null;
  restricted_skus?: string[];
  updated_at: string;
}

export interface ReturnRequestRow {
  id: string;
  return_id: string;
  /** Customer-facing short id, e.g. RET-00042 (unique). */
  reference_code: string;
  phone: string;
  order_id: string;
  branch_id: string | null;
  status: ReturnRequestStatus;
  type: ReturnRequestType;
  items: ReturnRequestItem[];
  amount_refund: number;
  amount_to_pay: number;
  shipping_fee: number;
  payplus_payment_id: string | null;
  payment_status: string | null;
  confirm_token: string | null;
  replacement_order_id: string | null;
  customer_address: CustomerAddress | null;
  webhook_payload: Record<string, unknown> | null;
  staff_handling: StaffHandlingStatus | null;
  /** Set when staff updates the row (e.g. staff_handling). */
  updated_by_user_id?: string | null;
  updated_by_display_name?: string | null;
  /** Staff-only append-only log; not shown in customer-facing flows. */
  internal_notes_log?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ReturnRequestItem {
  sku: string;
  action: "return" | "replace" | "keep" | "unsure";
  reason_id?: string;
  selected_size_id?: string;
  product_name?: string;
  price?: number;
  /** Replacement size label when action is replace */
  size_label?: string;
  /** Replacement variant price when action is replace */
  size_price?: number;
}

export interface CustomerAddress {
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
}

export interface StaffRoleRow {
  id: string;
  user_id: string;
  role: "admin" | "csr" | "store_manager";
  branch_id: string | null;
}
