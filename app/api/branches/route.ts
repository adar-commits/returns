import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/** Branches from DB (branch_id, branch_desc, address, phone, waze_link). */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from("branches")
      .select("branch_id, branch_desc, address, phone, waze_link")
      .order("branch_desc");
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to load branches" }, { status: 502 });
    }
    const branches = (rows || []).map((r) => ({
      id: r.branch_id,
      name: r.branch_desc ?? r.branch_id,
      address: r.address ?? undefined,
      phone: r.phone ?? undefined,
      map_url: r.waze_link ?? undefined,
    }));
    return NextResponse.json({ branches });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
