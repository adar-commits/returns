import { NextResponse } from "next/server";
import { DEFAULT_APP_URL } from "@/lib/constants";

/**
 * PayPlus redirects the user here after failed or cancelled payment.
 * Redirect to a payment-failed page with return_id so they can try again or go back.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const return_id = searchParams.get("return_id");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_APP_URL);
  const failureUrl = new URL("/payment-failed", baseUrl);
  if (return_id) failureUrl.searchParams.set("return_id", return_id);

  return NextResponse.redirect(failureUrl.toString());
}
