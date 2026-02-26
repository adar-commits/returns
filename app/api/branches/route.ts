import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchBranches } from "@/lib/webhooks";

export async function GET() {
  try {
    const settings = await getSettings();
    const branchesUrl = settings?.branches_webhook_url || process.env.BRANCHES_WEBHOOK_URL;
    if (!branchesUrl) {
      return NextResponse.json({ error: "Branches API not configured" }, { status: 503 });
    }
    const branches = await fetchBranches(branchesUrl);
    return NextResponse.json({ branches });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
