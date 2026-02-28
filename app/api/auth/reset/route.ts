import { NextResponse } from "next/server";
import { clearCustomerSession } from "@/lib/customer-session";

/** QA reset — clears the customer session cookie so the app returns to the welcome page. */
export async function POST() {
  await clearCustomerSession();
  return NextResponse.json({ ok: true });
}
