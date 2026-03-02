import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSettings } from "@/lib/settings";
import { DEFAULT_WEBHOOK_URL } from "@/lib/constants";

/**
 * PayPlus redirects the user here after successful payment.
 * We confirm the return request, fire the n8n webhook, and redirect to the success page.
 * Handles both GET (redirect) and POST (form post from PayPlus).
 */
export async function GET(request: Request) {
  return handleSuccessRedirect(request);
}
export async function POST(request: Request) {
  return handleSuccessRedirect(request);
}

async function handleSuccessRedirect(request: Request) {
  const url = new URL(request.url);
  let return_id: string | null | undefined = url.searchParams.get("return_id");
  if (!return_id && request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json().catch(() => ({}));
        return_id = (body as Record<string, unknown>).return_id as string | undefined;
      } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const form = await request.formData().catch(() => null);
        return_id = form?.get("return_id") as string | undefined;
      }
    } catch (_) {}
  }
  if (!return_id) {
    return NextResponse.redirect(new URL("/?error=missing_return", request.url));
  }

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("return_requests")
    .select("id, return_id, status, webhook_payload")
    .eq("return_id", return_id)
    .single();

  if (error || !row) {
    return NextResponse.redirect(new URL("/orders?error=not_found", request.url));
  }

  if (row.status !== "awaiting_payment") {
    return NextResponse.redirect(
      new URL(`/success?returnId=${encodeURIComponent(return_id)}&shippingType=courier&branchName=`, request.url)
    );
  }

  const payload = row.webhook_payload as Record<string, unknown> | null;
  await supabase
    .from("return_requests")
    .update({ status: "confirmed", payment_status: "paid" })
    .eq("return_id", return_id);

  const shippingType = payload?.shipping && typeof payload.shipping === "object" && (payload.shipping as Record<string, unknown>).method === "branch"
    ? "branch"
    : "courier";
  const branchName =
    payload?.shipping &&
    typeof payload.shipping === "object" &&
    (payload.shipping as Record<string, unknown>).branch &&
    typeof (payload.shipping as Record<string, unknown>).branch === "object"
      ? String(((payload.shipping as Record<string, unknown>).branch as Record<string, unknown>).branch_name || "")
      : "";

  if (payload) {
    const settings = await getSettings();
    const finalUrl =
      settings?.final_webhook_url ||
      process.env.FINAL_WEBHOOK_URL ||
      DEFAULT_WEBHOOK_URL;
    if (finalUrl) {
      try {
        await fetch(finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, status: "confirmed" }),
        });
      } catch (e) {
        console.error("PayPlus success callback webhook error:", e);
      }
    }
  }

  // Redirect to thank-you on same origin that received the callback
  const origin = new URL(request.url).origin;
  const successUrl = new URL("/success", origin);
  successUrl.searchParams.set("returnId", return_id);
  successUrl.searchParams.set("shippingType", shippingType);
  successUrl.searchParams.set("branchName", branchName);
  return NextResponse.redirect(successUrl.toString());
}
