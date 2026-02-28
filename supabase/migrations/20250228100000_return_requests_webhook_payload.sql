-- Store full webhook payload for payment flow: fire on PayPlus success redirect
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS webhook_payload jsonb;
