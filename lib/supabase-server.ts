import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side only. Use in API routes / server actions. Bypasses RLS. */
export function createServerClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}
