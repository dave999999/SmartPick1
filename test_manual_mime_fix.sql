-- Test: Manually fix an existing file's MIME type to see if that helps
UPDATE storage.objects
SET metadata = jsonb_set(
  metadata,
  '{mimetype}',
  '"image/webp"'::jsonb,
  true
)
WHERE bucket_id = 'partner-images'
  AND name = '1b5f8b01-157b-4997-8f9b-411eec09b1c9/1766606343962-e02b462af57c4.webp';

-- Verify
SELECT name, metadata->>'mimetype', metadata->>'size'
FROM storage.objects
WHERE name = '1b5f8b01-157b-4997-8f9b-411eec09b1c9/1766606343962-e02b462af57c4.webp';
