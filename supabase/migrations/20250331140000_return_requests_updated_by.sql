-- Last staff touch (e.g. staff_handling); display name denormalized for read performance
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS updated_by_user_id uuid;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS updated_by_display_name text;

COMMENT ON COLUMN return_requests.updated_by_user_id IS 'Supabase auth user id of staff who last updated the request row.';
COMMENT ON COLUMN return_requests.updated_by_display_name IS 'Display name or email of staff who last updated the request row.';
