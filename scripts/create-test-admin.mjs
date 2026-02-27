/**
 * One-off: create staff test admin (email test@test.com, password testpass).
 * Run from repo root: node scripts/create-test-admin.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or set in .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local if present
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = "test@test.com";
const PASSWORD = "testpass";

async function main() {
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError) {
    if (createError.message?.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === EMAIL);
      if (existing) {
        const { error: roleError } = await supabase.from("staff_roles").upsert(
          { user_id: existing.id, role: "admin", branch_id: null },
          { onConflict: "user_id" }
        );
        if (roleError) {
          console.error("staff_roles upsert:", roleError.message);
          process.exit(1);
        }
        console.log("User already exists; staff_roles set to admin. Login:", EMAIL, PASSWORD);
        return;
      }
    }
    console.error("Create user:", createError.message);
    process.exit(1);
  }
  if (!user?.user?.id) {
    console.error("No user id returned");
    process.exit(1);
  }
  const { error: roleError } = await supabase.from("staff_roles").insert({
    user_id: user.user.id,
    role: "admin",
    branch_id: null,
  });
  if (roleError) {
    console.error("staff_roles insert:", roleError.message);
    process.exit(1);
  }
  console.log("Test admin created. Login at /staff/login with:", EMAIL, PASSWORD);
}

main();
