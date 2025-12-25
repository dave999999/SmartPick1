-- Function to fix MIME type in storage metadata
-- Supabase JS client ignores contentType parameter, so we fix it after upload

CREATE OR REPLACE FUNCTION fix_storage_mime_type(
  p_bucket_id text,
  p_file_name text,
  p_correct_mime_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the metadata JSONB to set correct mimetype
  UPDATE storage.objects
  SET metadata = jsonb_set(
    metadata,
    '{mimetype}',
    to_jsonb(p_correct_mime_type),
    true
  )
  WHERE bucket_id = p_bucket_id
    AND name = p_file_name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION fix_storage_mime_type TO authenticated;
