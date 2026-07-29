/**
 * One-off: import products from CSV export into public.products.
 * Run from repo root: node scripts/import-products.mjs /path/to/products_rows.csv
 */
import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync, readFileSync } from "fs";
import { createInterface } from "readline";
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

const csvPath = process.argv[2] ?? "/Users/dr/Downloads/products_rows.csv";
if (!existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COLUMNS = [
  "sku",
  "product_title",
  "active",
  "creation_date",
  "family_id",
  "family_description",
  "currency",
  "baseprice_novat",
  "baseprice_vat",
  "standard_cost_ils",
  "price_minimum",
  "price_buying",
  "material",
  "color",
  "style",
  "fringes",
  "shape",
  "technique",
  "international_size",
  "model",
  "ooak",
  "marketplace_title",
  "length",
  "width",
  "sqm",
  "supplier_id",
  "supplier_name",
  "product_type",
  "image_url",
  "sku_url",
  "main_category",
  "categories",
  "size_display",
  "web_product_id",
  "web_product_name",
  "product_id_name",
];

const NUMERIC = new Set([
  "baseprice_novat",
  "baseprice_vat",
  "standard_cost_ils",
  "price_minimum",
  "price_buying",
  "length",
  "width",
  "sqm",
]);
const BOOLEAN = new Set(["active", "ooak"]);

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
    let val = toNull(values[i]);
    if (val == null) {
      row[key] = null;
      continue;
    }
    if (BOOLEAN.has(key)) {
      row[key] = val === "true" ? true : val === "false" ? false : null;
    } else if (NUMERIC.has(key)) {
      row[key] = Number(val);
    } else {
      row[key] = val;
    }
  }
  return row;
}

async function insertBatch(batch, batchNo) {
  const { error } = await supabase.from("products").insert(batch);
  if (error) {
    console.error(`Batch ${batchNo} failed:`, error.message);
    process.exit(1);
  }
}

async function main() {
  const rl = createInterface({ input: createReadStream(csvPath, { encoding: "utf8" }), crlfDelay: Infinity });
  let header = null;
  let batch = [];
  let total = 0;
  let batchNo = 0;
  const BATCH_SIZE = 500;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvLine(line);
      if (header[0]?.charCodeAt(0) === 0xfeff) header[0] = header[0].slice(1);
      continue;
    }
    batch.push(mapRow(parseCsvLine(line)));
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

  const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true });
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
