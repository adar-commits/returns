-- Branch inventory (synced from external source; FK to products)
CREATE TABLE public.branch_inventory (
  sku text NOT NULL,
  branch_id text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  porders numeric NOT NULL DEFAULT 0,
  orders numeric NOT NULL DEFAULT 0,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT branch_inventory_pkey PRIMARY KEY (sku, branch_id),
  CONSTRAINT branch_inventory_sku_fkey FOREIGN KEY (sku) REFERENCES products (sku) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch_id
  ON public.branch_inventory USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_sku
  ON public.branch_inventory USING btree (sku);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_synced_at
  ON public.branch_inventory USING btree (synced_at DESC);

-- Server-side sync / app API via service role; no direct client access
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access branch_inventory" ON public.branch_inventory FOR ALL USING (false);
