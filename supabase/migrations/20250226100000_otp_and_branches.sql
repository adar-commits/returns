-- OTP codes: we generate and store; send webhook delivers (e.g. WhatsApp). Verify is local.
CREATE TABLE otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_phone_expires ON otp_codes(phone, expires_at);

-- Branches: for first steps use DB (branch_id, branch_desc, address, phone, waze_link)
CREATE TABLE branches (
  branch_id text PRIMARY KEY,
  branch_desc text,
  address text,
  phone text,
  waze_link text
);

-- RLS: otp_codes used server-side only (no direct client access)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access otp_codes" ON otp_codes FOR ALL USING (false);

-- branches: readable by everyone (customer-facing branch list)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read branches" ON branches FOR SELECT USING (true);
