import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createStaffSession } from "@/lib/staff-session";

/**
 * After browser PKCE exchange, client sends access_token; we verify with Supabase and set staff cookie.
 */
export async function POST(request: Request) {
  let body: { access_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body.access_token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = userData.user;
  const { data: roleRow } = await supabase
    .from("staff_roles")
    .select("role, branch_id")
    .eq("user_id", user.id)
    .single();

  if (!roleRow) {
    return NextResponse.json({ error: "not_staff" }, { status: 403 });
  }

  await createStaffSession({
    userId: user.id,
    role: roleRow.role as "admin" | "csr" | "store_manager",
    branch_id: roleRow.branch_id,
  });

  return NextResponse.json({ ok: true });
}
