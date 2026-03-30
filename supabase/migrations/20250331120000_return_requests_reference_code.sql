-- Short human-readable request number for customers (in addition to return_id).
-- Format: RET-00001 … RET-99999 (sequence-backed, unique).

ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS reference_code text;

UPDATE return_requests AS r
SET reference_code = n.code
FROM (
  SELECT
    id,
    'RET-' || lpad(row_number() OVER (ORDER BY created_at ASC, id ASC)::text, 5, '0') AS code
  FROM return_requests
  WHERE reference_code IS NULL
) AS n
WHERE r.id = n.id;

CREATE SEQUENCE IF NOT EXISTS return_request_reference_seq;

SELECT setval(
  'return_request_reference_seq',
  COALESCE(
    (
      SELECT MAX(replace(reference_code, 'RET-', '')::integer)
      FROM return_requests
      WHERE reference_code ~ '^RET-[0-9]+$'
    ),
    0
  )
);

ALTER TABLE return_requests ALTER COLUMN reference_code SET NOT NULL;

ALTER TABLE return_requests DROP CONSTRAINT IF EXISTS return_requests_reference_code_key;
ALTER TABLE return_requests ADD CONSTRAINT return_requests_reference_code_key UNIQUE (reference_code);

CREATE OR REPLACE FUNCTION set_return_request_reference_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR trim(NEW.reference_code) = '' THEN
    NEW.reference_code := 'RET-' || lpad(nextval('return_request_reference_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS return_requests_set_reference_code ON return_requests;
CREATE TRIGGER return_requests_set_reference_code
  BEFORE INSERT ON return_requests
  FOR EACH ROW
  EXECUTE PROCEDURE set_return_request_reference_code();

COMMENT ON COLUMN return_requests.reference_code IS 'Customer-facing short id (RET-#####). Distinct from return_id (internal opaque id).';
