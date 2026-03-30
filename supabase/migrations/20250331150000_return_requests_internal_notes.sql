-- Staff-only notes on return request (not exposed to customer flows).
ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS internal_notes text;

COMMENT ON COLUMN public.return_requests.internal_notes IS 'Internal staff notes; not shown to customers.';
