-- Restricted SKUs: items in this list are hidden from the return/replace selection page
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS restricted_skus jsonb NOT NULL DEFAULT '[]'::jsonb;
