import { createServerClient } from "./supabase-server";
import { getSettings } from "./settings";
import { DEFAULT_SIZES_WEBHOOK_URL } from "./constants";
import { fetchSizesBatch, type SizeOption } from "./webhooks";

export type ItemsDetailEntry = Record<string, unknown>;

function pickRawLineImage(raw: Record<string, unknown> | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.image_url ?? raw.image ?? raw.thumbnail ?? raw.thumb ?? raw.Image ?? raw.picture;
  if (typeof v === "string" && v.trim()) return v.trim();
  const arr = raw.images;
  if (Array.isArray(arr) && typeof arr[0] === "string" && arr[0].trim()) return arr[0].trim();
  return undefined;
}

function pickRawLineProductUrl(raw: Record<string, unknown> | undefined): string | undefined {
  if (!raw) return undefined;
  const v =
    raw.product_url ?? raw.productUrl ?? raw.url ?? raw.link ?? raw.product_link ?? raw.href;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function rawLineBySku(rawItems: ItemsDetailEntry[] | undefined, sku: string): Record<string, unknown> | undefined {
  if (!rawItems?.length) return undefined;
  const row = rawItems.find((r) => String(r.sku ?? "").trim() === sku);
  return row as Record<string, unknown> | undefined;
}

function firstImageForLine(sizes: SizeOption[] | undefined, newSizeId: string | null): string | undefined {
  if (!sizes?.length) return undefined;
  if (newSizeId) {
    const m = sizes.find((s) => s.id === newSizeId);
    if (m?.image) return m.image;
    if (m?.images?.[0]) return m.images[0];
  }
  const first = sizes[0];
  return first?.image ?? first?.images?.[0];
}

function imageForLine(
  sizes: SizeOption[] | undefined,
  newSizeId: string | null,
  actionType: string | undefined
): string | undefined {
  if (actionType === "replace" && newSizeId) {
    const fromVariant = firstImageForLine(sizes, newSizeId);
    if (fromVariant) return fromVariant;
  }
  return firstImageForLine(sizes, null);
}

export async function enrichItemsDetailWithDisplayMedia(
  itemsDetail: ItemsDetailEntry[],
  sizesUrl: string,
  rawItems?: ItemsDetailEntry[]
): Promise<ItemsDetailEntry[]> {
  const skus = Array.from(new Set(itemsDetail.map((d) => String(d.sku ?? "").trim()).filter(Boolean)));
  if (skus.length === 0) return itemsDetail.map((r) => ({ ...r }));

  const { results, productUrlBySku } = await fetchSizesBatch(skus, sizesUrl);

  return itemsDetail.map((row) => {
    const sku = String(row.sku ?? "").trim();
    const sizes = results[sku] ?? [];
    const newSizeId = row.new_size_id != null ? String(row.new_size_id) : null;
    const actionType = typeof row.action_type === "string" ? row.action_type : undefined;
    const raw = rawLineBySku(rawItems, sku);

    let imageUrl = imageForLine(sizes, newSizeId, actionType);
    if (!imageUrl) imageUrl = pickRawLineImage(raw);

    let productUrl = productUrlBySku[sku] ?? pickRawLineProductUrl(raw);

    const out: ItemsDetailEntry = { ...row };
    if (imageUrl) out.image_url = imageUrl;
    if (productUrl) out.product_url = productUrl;
    return out;
  });
}

function itemsGainedDisplayFields(prev: ItemsDetailEntry[], next: ItemsDetailEntry[]): boolean {
  return next.some((r, i) => {
    const p = prev[i];
    if (!p) return Boolean(r.image_url || r.product_url);
    const gotImg = Boolean(r.image_url && r.image_url !== p.image_url);
    const gotUrl = Boolean(r.product_url && r.product_url !== p.product_url);
    return gotImg || gotUrl;
  });
}

/**
 * Add image_url / product_url to items_detail (sizes webhook + raw order lines). Idempotent.
 * Only mutates payload when new display fields appear.
 */
export async function enrichWebhookPayloadDisplayMedia(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (payload.display_media_enriched_at) return payload;
  const items = payload.items_detail;
  if (!Array.isArray(items) || items.length === 0) return payload;

  const settings = await getSettings();
  const sizesUrl =
    settings?.sizes_webhook_url || process.env.SIZES_WEBHOOK_URL || DEFAULT_SIZES_WEBHOOK_URL;

  const order = payload.order as Record<string, unknown> | undefined;
  const rawItems = order?.raw_items as ItemsDetailEntry[] | undefined;

  const prev = items as ItemsDetailEntry[];
  let enriched: ItemsDetailEntry[];
  if (sizesUrl) {
    enriched = await enrichItemsDetailWithDisplayMedia(prev, sizesUrl, rawItems);
  } else {
    enriched = prev.map((row) => {
      const sku = String(row.sku ?? "").trim();
      const raw = rawLineBySku(rawItems, sku);
      const out = { ...row };
      const img = pickRawLineImage(raw);
      const pu = pickRawLineProductUrl(raw);
      if (img) out.image_url = img;
      if (pu) out.product_url = pu;
      return out;
    });
  }

  if (!itemsGainedDisplayFields(prev, enriched)) return payload;

  return {
    ...payload,
    items_detail: enriched,
    display_media_enriched_at: new Date().toISOString(),
  };
}

export async function persistEnrichedWebhookPayload(return_id: string, payload: Record<string, unknown>): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("return_requests").update({ webhook_payload: payload }).eq("return_id", return_id);
  if (error) console.error("persistEnrichedWebhookPayload:", error);
}

/** Load payload, merge display media, save. Skips if already enriched. */
export async function persistDisplayMediaForReturnIfNeeded(return_id: string): Promise<void> {
  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("return_requests")
    .select("webhook_payload")
    .eq("return_id", return_id)
    .single();
  if (error || !row?.webhook_payload) return;
  const payload = row.webhook_payload as Record<string, unknown>;
  if (payload.display_media_enriched_at) return;
  const enriched = await enrichWebhookPayloadDisplayMedia(payload);
  if (enriched === payload) return;
  await persistEnrichedWebhookPayload(return_id, enriched);
}
