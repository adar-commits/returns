import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchSizesBatch } from "@/lib/webhooks";
import { DEFAULT_SIZES_WEBHOOK_URL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Accept batch { Items: string[] } or legacy { sku: string }
    let skus: string[] = [];
    if (Array.isArray(body.Items) && body.Items.length > 0) {
      skus = body.Items.filter((s: unknown) => typeof s === "string" && s.trim());
    } else if (typeof body.sku === "string" && body.sku.trim()) {
      skus = [body.sku.trim()];
    }
    if (skus.length === 0) {
      return NextResponse.json({ error: "Items or sku required" }, { status: 400 });
    }
    const settings = await getSettings();
    const sizesUrl = settings?.sizes_webhook_url || process.env.SIZES_WEBHOOK_URL || DEFAULT_SIZES_WEBHOOK_URL;
    const { results: safeResults, labsCsqr } = await fetchSizesBatch(skus, sizesUrl);
    let results = safeResults && typeof safeResults === "object" ? safeResults : {};
    let labsOut = labsCsqr && typeof labsCsqr === "object" ? labsCsqr : {};
    // If single SKU and webhook returned data under a different key, normalize so client gets data under requested SKU
    if (skus.length === 1) {
      const requested = skus[0];
      if (results[requested] == null && Object.keys(results).length > 0) {
        results = { [requested]: Object.values(results)[0] };
      }
      if (labsOut[requested] == null && Object.keys(labsOut).length > 0) {
        const firstVal = Object.values(labsOut)[0];
        if (typeof firstVal === "number" && Number.isFinite(firstVal)) {
          labsOut = { [requested]: firstVal };
        }
      }
    }
    const sizes = skus.length === 1 ? (results[skus[0]] ?? []) : [];
    return NextResponse.json({ results, labsCsqr: labsOut, sizes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
