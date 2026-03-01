import { NextResponse } from "next/server";
import { DEFAULT_APP_URL } from "@/lib/constants";

/**
 * PayPlus redirects the user here after failed or cancelled payment.
 * Redirect to a payment-failed page with return_id so they can try again or go back.
 * Handles both GET (redirect) and POST (form post from PayPlus).
 */
export async function GET(request: Request) {
  return handleFailureRedirect(request);
}
export async function POST(request: Request) {
  return handleFailureRedirect(request);
}

async function handleFailureRedirect(request: Request) {
  const url = new URL(request.url);
  let return_id = url.searchParams.get("return_id");
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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_APP_URL);
  const failureUrl = new URL("/payment-failed", baseUrl);
  if (return_id) failureUrl.searchParams.set("return_id", return_id);

  return NextResponse.redirect(failureUrl.toString());
}
