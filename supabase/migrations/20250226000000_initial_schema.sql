-- Returns Hub: app_settings, return_requests, staff_roles
-- OTP and orders are external API only (no otp_codes or orders tables).

-- Enum for return request status (covers both return and replacement flows)
CREATE TYPE return_request_status AS ENUM (
  'pending_approval',   -- return: awaiting manager confirm
  'awaiting_confirm',   -- return: same as pending_approval
  'awaiting_payment',   -- replacement: before Payplus
  'confirmed',          -- return: manager approved; replacement: paid
  'pickup_awaiting',    -- return: waiting for pickup
  'received',           -- return: we received items
  'refunded',           -- return: refund done
  'shipped',            -- replacement
  'in_transit',         -- replacement
  'delivered'           -- replacement
);

CREATE TYPE return_request_type AS ENUM ('return', 'replacement', 'mixed');

-- Singleton app settings (business + content + webhook URLs)
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eligibility_days int NOT NULL DEFAULT 30,
  return_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Webhook URLs (optional; can use env instead)
  otp_send_url text,
  otp_verify_url text,
  orders_webhook_url text,
  sizes_webhook_url text,
  branches_webhook_url text,
  final_webhook_url text,
  invoices_webhook_url text,
  -- Content (Admin-editable)
  content_banner jsonb,
  content_footer jsonb,
  content_help_banner jsonb DEFAULT '{"text":"צריכים עזרה?","href":""}'::jsonb,
  content_headlines jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row; id can be fixed for easy lookup
INSERT INTO app_settings (id, eligibility_days, return_reasons, shipping_tiers)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  30,
  '["פגם במוצר","גודל לא מתאים","שונה את דעתי","אחר"]'::jsonb,
  '[{"min":0,"max":100,"fee":30},{"min":100,"max":250,"fee":50},{"min":250,"max":500,"fee":85}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Return requests (customer submissions)
CREATE TABLE return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  order_id text NOT NULL,
  branch_id text,
  status return_request_status NOT NULL DEFAULT 'pending_approval',
  type return_request_type NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount_refund numeric(12,2) NOT NULL DEFAULT 0,
  amount_to_pay numeric(12,2) NOT NULL DEFAULT 0,
  shipping_fee numeric(12,2) NOT NULL DEFAULT 0,
  payplus_payment_id text,
  payment_status text,
  confirm_token text UNIQUE,
  replacement_order_id text,
  customer_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_return_requests_phone ON return_requests(phone);
CREATE INDEX idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX idx_return_requests_branch_id ON return_requests(branch_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);

-- Staff roles (Supabase Auth users); user_id = auth.uid()
CREATE TABLE staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'csr', 'store_manager')),
  branch_id text,
  UNIQUE(user_id)
);

-- Store managers must have branch_id
ALTER TABLE staff_roles ADD CONSTRAINT store_manager_branch
  CHECK (role <> 'store_manager' OR (branch_id IS NOT NULL AND branch_id <> ''));

-- RLS: app_settings readable by authenticated staff; writable by admin only (enforced in app)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Allow anon/service to read app_settings for customer-facing content (or use service role in API)
CREATE POLICY "Allow read app_settings" ON app_settings FOR SELECT USING (true);

-- return_requests: no anon access (customer access via app API with service role); staff read via authenticated
CREATE POLICY "Staff read return_requests" ON return_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_roles sr WHERE sr.user_id = auth.uid()));
-- Insert/update from app only (service role bypasses RLS)

-- staff_roles: only own row for read; admin management via service role in app
CREATE POLICY "Staff read own role" ON staff_roles FOR SELECT USING (auth.uid() = user_id);

-- Trigger to keep updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_requests_updated_at
  BEFORE UPDATE ON return_requests FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
