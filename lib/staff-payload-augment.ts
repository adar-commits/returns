import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichWebhookPayloadDisplayMedia, type ItemsDetailEntry } from "@/lib/items-display-enrichment";

const PLACEHOLDER_RUG = "/placeholder-rug.svg";

/**
 * Backfills webhook_payload for staff detail: replacement SKUs (from sizes API),
 * display media, shipping.fee from row, placeholder image when still empty.
 * Persists when JSON snapshot differs from stored payload.
 */
export async function augmentWebhookPayloadForStaffView(
  supabase: SupabaseClient,
  row: { return_id: string; shipping_fee: number; webhook_payload: Record<string, unknown> | null }
): Promise<{ webhook_payload: Record<string, unknown> | null; persisted: boolean }> {
  if (!row.webhook_payload) {
    return { webhook_payload: null, persisted: false };
  }

  const snapshotBefore = JSON.stringify(row.webhook_payload);

  let working: Record<string, unknown> = { ...row.webhook_payload };
  working = await enrichWebhookPayloadDisplayMedia(working, { force: true });

  const shipRaw = working.shipping;
  if (shipRaw && typeof shipRaw === "object" && !Array.isArray(shipRaw)) {
    const ship = { ...(shipRaw as Record<string, unknown>) };
    if (ship.fee == null && row.shipping_fee != null) {
      ship.fee = row.shipping_fee;
      working = { ...working, shipping: ship };
    }
  }

  const items = working.items_detail;
  if (Array.isArray(items) && items.length > 0) {
    const withPlaceholders = (items as ItemsDetailEntry[]).map((it) => {
      const u = it.image_url != null ? String(it.image_url).trim() : "";
      if (u) return it;
      return { ...it, image_url: PLACEHOLDER_RUG };
    });
    working = { ...working, items_detail: withPlaceholders };
  }

  const snapshotAfter = JSON.stringify(working);
  if (snapshotAfter === snapshotBefore) {
    return { webhook_payload: working, persisted: false };
  }
  const { error } = await supabase.from("return_requests").update({ webhook_payload: working }).eq("return_id", row.return_id);
  if (error) {
    console.error("augmentWebhookPayloadForStaffView:", error);
    return { webhook_payload: working, persisted: false };
  }
  return { webhook_payload: working, persisted: true };
}
