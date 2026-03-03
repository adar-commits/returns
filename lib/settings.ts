import { createServerClient } from "./supabase-server";
import type { AppSettingsRow, ShippingTier, ContentHelpBanner } from "./db-types";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export async function getSettings(): Promise<AppSettingsRow | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single();
  if (error || !data) return null;
  return data as unknown as AppSettingsRow;
}

export async function updateSettings(updates: Partial<{
  eligibility_days: number;
  return_reasons: string[];
  shipping_tiers: ShippingTier[];
  content_banner: unknown;
  content_footer: unknown;
  content_help_banner: ContentHelpBanner | null;
  content_headlines: unknown;
  otp_send_url: string | null;
  otp_verify_url: string | null;
  orders_webhook_url: string | null;
  sizes_webhook_url: string | null;
  branches_webhook_url: string | null;
  final_webhook_url: string | null;
  invoices_webhook_url: string | null;
  restricted_skus: string[] | null;
}>) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", SETTINGS_ID)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AppSettingsRow;
}
