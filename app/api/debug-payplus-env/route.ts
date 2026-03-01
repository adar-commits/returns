import { NextResponse } from "next/server";

/**
 * Debug: check if PayPlus env vars are available in this environment.
 * GET /api/debug-payplus-env
 * Returns { PAYPLUS_API_KEY_set, PAYPLUS_SECRET_KEY_set } (no values).
 * Remove or restrict this route in production if you don't want it exposed.
 */
export async function GET() {
  const apiKey = process.env.PAYPLUS_API_KEY;
  const secretKey = process.env.PAYPLUS_SECRET_KEY;
  return NextResponse.json({
    PAYPLUS_API_KEY_set: Boolean(apiKey?.trim()),
    PAYPLUS_SECRET_KEY_set: Boolean(secretKey?.trim()),
    note: "If either is false, set the var in .env.local (local) or Vercel → Settings → Environment Variables, then redeploy.",
  });
}
