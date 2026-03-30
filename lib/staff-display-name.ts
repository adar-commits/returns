import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveStaffDisplayName(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return "—";
    const u = data.user;
    const meta = u.user_metadata as Record<string, unknown> | undefined;
    const full =
      (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta?.name === "string" && meta.name.trim()) ||
      "";
    if (full) return full;
    return u.email?.trim() || userId.slice(0, 8);
  } catch {
    return "—";
  }
}
