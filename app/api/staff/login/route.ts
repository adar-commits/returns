import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase-server";
import { createStaffSession } from "@/lib/staff-session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const supabase = createServerClient();
    const { data: roleRow } = await supabase
      .from("staff_roles")
      .select("role, branch_id")
      .eq("user_id", authData.user.id)
      .single();
    if (!roleRow) {
      return NextResponse.json({ error: "Not a staff user" }, { status: 403 });
    }
    await createStaffSession({
      userId: authData.user.id,
      role: roleRow.role as "admin" | "csr" | "store_manager",
      branch_id: roleRow.branch_id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
