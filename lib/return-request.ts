import { createServerClient } from "./supabase-server";
import type { ReturnRequestItem } from "./db-types";

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateReturnId(): string {
  const t = Date.now().toString(36).toUpperCase();
  let r = "";
  for (let i = 0; i < 6; i++) r += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `RR-${t}-${r}`;
}

function generateConfirmToken(): string {
  const arr = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 24; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createReturnRequest(params: {
  phone: string;
  order_id: string;
  branch_id: string | null;
  type: "return" | "replacement" | "mixed";
  items: ReturnRequestItem[];
  amount_refund: number;
  amount_to_pay: number;
  shipping_fee: number;
  customer_address: Record<string, unknown> | null;
  webhook_payload?: Record<string, unknown> | null;
}) {
  const supabase = createServerClient();
  const return_id = generateReturnId();
  const confirm_token = generateConfirmToken();

  const { data, error } = await supabase
    .from("return_requests")
    .insert({
      return_id,
      phone: params.phone,
      order_id: params.order_id,
      branch_id: params.branch_id,
      status: params.amount_to_pay > 0 ? "awaiting_payment" : "pending_approval",
      type: params.type,
      items: params.items,
      amount_refund: params.amount_refund,
      amount_to_pay: params.amount_to_pay,
      shipping_fee: params.shipping_fee,
      customer_address: params.customer_address,
      confirm_token,
      ...(params.webhook_payload != null && { webhook_payload: params.webhook_payload }),
    })
    .select("id, return_id, reference_code")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    return_id: data.return_id,
    reference_code: data.reference_code as string,
    confirm_token,
  };
}

export async function updateReturnRequestReplacementOrderId(returnId: string, replacementOrderId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("return_requests")
    .update({ replacement_order_id: replacementOrderId })
    .eq("return_id", returnId);
  if (error) throw error;
}

export async function setReturnRequestStatus(returnId: string, status: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("return_requests")
    .update({ status })
    .eq("return_id", returnId);
  if (error) throw error;
}

export async function updateReturnRequestWebhookPayload(returnId: string, payload: Record<string, unknown>) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("return_requests")
    .update({ webhook_payload: payload })
    .eq("return_id", returnId);
  if (error) throw error;
}

export async function confirmByToken(token: string): Promise<{ return_id: string; reference_code: string | null } | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("return_requests")
    .update({ status: "confirmed" })
    .eq("confirm_token", token)
    .select("return_id, reference_code")
    .single();
  if (error || !data) return null;
  return { return_id: data.return_id, reference_code: (data.reference_code as string | null) ?? null };
}
