import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { fetchBranches } from "@/lib/webhooks";
import { DEFAULT_BRANCHES_WEBHOOK_URL } from "@/lib/constants";

export async function GET() {
  try {
    const settings = await getSettings();
    const url =
      settings?.branches_webhook_url ||
      process.env.BRANCHES_WEBHOOK_URL ||
      DEFAULT_BRANCHES_WEBHOOK_URL;
    const branches = await fetchBranches(url);
    return NextResponse.json({ branches }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
