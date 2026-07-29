/**
 * One-off: import branch_inventory from CSV export into public.branch_inventory.
 * Run from repo root: node scripts/import-branch-inventory.mjs /path/to/branch_inventory_rows.csv
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

const csvPath = process.argv[2] ?? "/Users/dr/Downloads/branch_inventory_rows.csv";
if (!existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COLUMNS = ["sku", "branch_id", "quantity", "porders", "orders", "synced_at"];
const NUMERIC = new Set(["quantity", "porders", "orders"]);

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function toNull(v) {
  return v === "" || v == null ? null : v;
}

function mapRow(values) {
  const row = {};
  for (let i = 0; i < COLUMNS.length; i++) {
    const key = COLUMNS[i];
    const val = toNull(values[i]);
    if (val == null) {
      row[key] = null;
      continue;
    }
    if (NUMERIC.has(key)) {
      row[key] = Number(val);
    } else {
      row[key] = val;
    }
  }
  return row;
}

async function insertBatch(batch, batchNo) {
  const { error } = await supabase.from("branch_inventory").insert(batch);
  if (error) {
    console.error(`Batch ${batchNo} failed:`, error.message);
    if (error.details) console.error("Details:", error.details);
    process.exit(1);
  }
}

async function main() {
  const content = readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    console.error("CSV has no data rows");
    process.exit(1);
  }

  let batch = [];
  let total = 0;
  let batchNo = 0;
  const BATCH_SIZE = 500;

  for (let i = 1; i < lines.length; i++) {
    batch.push(mapRow(parseCsvLine(lines[i])));
    if (batch.length >= BATCH_SIZE) {
      batchNo++;
      await insertBatch(batch, batchNo);
      total += batch.length;
      console.log(`Imported ${total} rows...`);
      batch = [];
    }
  }

  if (batch.length) {
    batchNo++;
    await insertBatch(batch, batchNo);
    total += batch.length;
  }

  const { count, error } = await supabase.from("branch_inventory").select("*", { count: "exact", head: true });
  if (error) {
    console.error("Verify count failed:", error.message);
    process.exit(1);
  }

  console.log(`Done. Imported ${total} rows from CSV. Table count: ${count}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
