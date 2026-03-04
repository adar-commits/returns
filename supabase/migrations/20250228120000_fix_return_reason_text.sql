-- Fix return reason: "שונה את דעתי" → "שיניתי את דעתי"
UPDATE app_settings
SET return_reasons = (
  SELECT jsonb_agg(
    CASE WHEN elem = '"שונה את דעתי"'::jsonb THEN '"שיניתי את דעתי"'::jsonb
         ELSE elem END
  )
  FROM jsonb_array_elements(return_reasons) AS elem
)
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
  AND return_reasons::text LIKE '%שונה את דעתי%';
