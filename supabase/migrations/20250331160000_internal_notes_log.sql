-- Append-only internal notes: [{ text, created_at, user_id, user_name }, ...]

ALTER TABLE public.return_requests
ADD COLUMN IF NOT EXISTS internal_notes_log jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.return_requests.internal_notes_log IS
  'Staff-only internal notes (append-only). JSON array of { text, created_at, user_id, user_name }.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'return_requests'
      AND column_name = 'internal_notes'
  ) THEN
    UPDATE public.return_requests
    SET internal_notes_log = jsonb_build_array(
      jsonb_build_object(
        'text', internal_notes,
        'created_at', COALESCE(updated_at, created_at),
        'user_id', updated_by_user_id,
        'user_name', updated_by_display_name
      )
    )
    WHERE internal_notes IS NOT NULL
      AND length(trim(internal_notes)) > 0
      AND internal_notes_log = '[]'::jsonb;

    ALTER TABLE public.return_requests DROP COLUMN internal_notes;
  END IF;
END $$;
