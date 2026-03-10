import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchSizesBatch } from "@/lib/webhooks";
import { deliveryFeeForProduct } from "@/lib/delivery-fee";
import { DEFAULT_SIZES_WEBHOOK_URL } from "@/lib/constants";

/**
 * Debug endpoint: call the GetSizes webhook and return the raw response for inspection.
 * GET /api/debug/sizes?sku=31502091-200290
 * or POST with body { "Items": ["31502091-200290"] } or { "sku": "31502091-200290" }
 * Returns: raw webhook JSON, normalized labsCsqr/results, and the delivery fee we would compute.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku")?.trim();
  if (!sku) {
    return NextResponse.json(
      { error: "Missing sku query param. Example: /api/debug/sizes?sku=31502091-200290" },
      { status: 400 }
    );
  }
  return runInspect([sku]);
}

export async function POST(request: Request) {
  let skus: string[] = [];
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body.Items) && body.Items.length > 0) {
      skus = body.Items.filter((s: unknown) => typeof s === "string" && String(s).trim()).map((s) => String(s).trim());
    } else if (typeof body.sku === "string" && body.sku.trim()) {
      skus = [body.sku.trim()];
    }
  } catch (_) {}
  if (skus.length === 0) {
    return NextResponse.json(
      { error: "Missing body. Send { \"Items\": [\"31502091-200290\"] } or { \"sku\": \"31502091-200290\" }" },
      { status: 400 }
    );
  }
  return runInspect(skus);
}

async function runInspect(skus: string[]) {
  const settings = await getSettings();
  const sizesUrl = settings?.sizes_webhook_url || process.env.SIZES_WEBHOOK_URL || DEFAULT_SIZES_WEBHOOK_URL;

  let rawResponse: unknown = null;
  let fetchError: string | null = null;
  try {
    const res = await fetch(sizesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Items: skus }),
    });
    const text = await res.text();
    if (!res.ok) {
      fetchError = `Webhook returned ${res.status}: ${text.slice(0, 500)}`;
    } else {
      try {
        rawResponse = JSON.parse(text);
      } catch {
        rawResponse = { _raw: text };
      }
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  let normalized: { results: Record<string, unknown>; labsCsqr: Record<string, number> } | null = null;
  let computedFee: number | null = null;
  let feeExplanation: string | null = null;
  if (!fetchError) {
    try {
      const { results, labsCsqr } = await fetchSizesBatch(skus, sizesUrl);
      normalized = {
        results: Object.fromEntries(
          Object.entries(results || {}).map(([k, v]) => [k, v?.map((s) => ({ label: s?.label, labs_csqr: s?.labs_csqr })) ?? []])
        ),
        labsCsqr: labsCsqr || {},
      };
      const requestedSku = skus[0];
      const labsVal = (labsCsqr || {})[requestedSku] ?? Object.values(labsCsqr || {})[0];
      const productName = "inspect";
      computedFee = deliveryFeeForProduct(productName, labsVal);
      feeExplanation = `Fee for LABS_CSQR=${labsVal ?? "null"} (productName="${productName}"): ${computedFee} ILS. Ranges: ≤0→85, ≤3.8→85, ≤5.8→100, ≤8.16→150, >8.16→300.`;
    } catch (e) {
      feeExplanation = `Normalize/fee error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    requestedSkus: skus,
    webhookUrl: sizesUrl.replace(/\/[^/]+$/, "/…"),
    rawResponse,
    fetchError,
    normalized,
    computedFee,
    feeExplanation,
  });
}
