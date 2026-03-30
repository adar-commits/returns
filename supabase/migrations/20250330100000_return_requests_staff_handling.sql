-- Back-office handling (orthogonal to logistics return_request_status)
CREATE TYPE staff_handling_status AS ENUM ('in_progress', 'completed');

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS staff_handling staff_handling_status NULL;

COMMENT ON COLUMN return_requests.staff_handling IS 'Staff back-office queue: in_progress | completed; logistics status stays in status.';
