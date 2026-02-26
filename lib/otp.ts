/**
 * OTP generation and verification. We generate the code, store it, send via webhook (#1);
 * verification is local (no webhook #2).
 */

import { createServerClient } from "@/lib/supabase-server";

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function createAndStoreOtp(phone: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const supabase = createServerClient();
  await supabase.from("otp_codes").insert({
    phone: phone.trim(),
    code,
    expires_at: expiresAt.toISOString(),
  });
  return code;
}

export async function verifyAndConsumeOtp(phone: string, code: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data: rows } = await supabase
    .from("otp_codes")
    .select("id")
    .eq("phone", phone.trim())
    .eq("code", code.trim())
    .gte("expires_at", new Date().toISOString())
    .limit(1);
  if (!rows?.length) return false;
  await supabase.from("otp_codes").delete().eq("id", rows[0].id);
  return true;
}
