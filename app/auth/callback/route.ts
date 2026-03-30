import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase-server";
import { createStaffSession } from "@/lib/staff-session";

/**
 * OAuth callback (e.g. Google). Exchanges code for session, verifies staff_roles, creates staff cookie, redirects to /staff.
 */
export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const { searchParams } = callbackUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/staff";
  // Use the origin of the URL the browser actually requested. Preferring x-forwarded-host
  // (and forcing https) sent localhost OAuth completions to production when proxies/env set it.
  const origin = callbackUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/staff/login?error=missing_code`);
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback exchange error:", error);
    return NextResponse.redirect(`${origin}/staff/login?error=exchange_failed`);
  }

  const user = data.user;
  if (!user) {
    return NextResponse.redirect(`${origin}/staff/login?error=no_user`);
  }

  const supabase = createServerClient();
  const { data: roleRow } = await supabase
    .from("staff_roles")
    .select("role, branch_id")
    .eq("user_id", user.id)
    .single();

  if (!roleRow) {
    return NextResponse.redirect(`${origin}/staff/login?error=not_staff`);
  }

  await createStaffSession({
    userId: user.id,
    role: roleRow.role as "admin" | "csr" | "store_manager",
    branch_id: roleRow.branch_id,
  });

  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/staff`;
  return NextResponse.redirect(redirectTo);
}
