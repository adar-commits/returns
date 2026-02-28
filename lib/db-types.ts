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
  updated_at: string;
}

export interface ReturnRequestRow {
  id: string;
  return_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface ReturnRequestItem {
  sku: string;
  action: "return" | "replace";
  reason_id?: string;
  selected_size_id?: string;
  product_name?: string;
  price?: number;
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
