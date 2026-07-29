-- Products catalog (synced from external source)
CREATE TABLE public.products (
  sku text NOT NULL,
  product_title text NOT NULL,
  active boolean NULL DEFAULT true,
  creation_date timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  family_id text NULL,
  family_description text NULL,
  currency text NULL DEFAULT 'ILS'::text,
  baseprice_novat numeric(12, 2) NULL,
  baseprice_vat numeric(12, 2) NULL,
  standard_cost_ils numeric(12, 2) NULL,
  price_minimum numeric(12, 2) NULL,
  price_buying numeric(12, 2) NULL,
  material text NULL,
  color text NULL,
  style text NULL,
  fringes text NULL,
  shape text NULL,
  technique text NULL,
  international_size text NULL,
  model text NULL,
  ooak boolean NULL DEFAULT false,
  marketplace_title text NULL,
  length numeric(10, 2) NULL,
  width numeric(10, 2) NULL,
  sqm numeric(10, 3) NULL,
  supplier_id text NULL,
  supplier_name text NULL,
  product_type text NULL,
  image_url text NULL,
  sku_url text NULL,
  main_category text NULL,
  categories text NULL,
  size_display text NULL,
  web_product_id text NULL,
  web_product_name text NULL,
  product_id_name text NULL,
  CONSTRAINT logparts_pkey PRIMARY KEY (sku)
);

CREATE INDEX IF NOT EXISTS idx_products_product_id_name
  ON public.products USING btree (product_id_name)
  WHERE (product_id_name IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_products_product_title
  ON public.products USING btree (product_title);

CREATE INDEX IF NOT EXISTS idx_products_family_id
  ON public.products USING btree (family_id);

CREATE INDEX IF NOT EXISTS idx_products_web_product_id
  ON public.products USING btree (web_product_id)
  WHERE (web_product_id IS NOT NULL);

-- Server-side sync / app API via service role; no direct client access
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access products" ON public.products FOR ALL USING (false);
