-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Date: 2025-11-08
-- Purpose: Fix storage permissions, file size limits, and points function access
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX STORAGE BUCKET FILE SIZE LIMITS (50MB → 5MB)
-- ============================================================================

-- Update offer-images bucket to 5MB limit
UPDATE storage.buckets
SET file_size_limit = 5242880,  -- 5MB (matches application constant)
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']  -- Remove GIF, match app
WHERE id = 'offer-images';

-- Update partner-images bucket to 5MB limit
UPDATE storage.buckets
SET file_size_limit = 5242880,  -- 5MB (matches application constant)
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']  -- Remove GIF, match app
WHERE id = 'partner-images';

-- ============================================================================
-- 2. RESTRICT STORAGE UPLOAD PERMISSIONS TO PARTNERS ONLY
-- ============================================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete offer images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload partner images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update partner images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete partner images" ON storage.objects;

-- Create strict policies: ONLY APPROVED PARTNERS can upload offer images
CREATE POLICY "Approved partners can upload offer images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'offer-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

CREATE POLICY "Approved partners can update offer images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'offer-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

CREATE POLICY "Approved partners can delete offer images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'offer-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

-- Partner images: ONLY APPROVED PARTNERS
CREATE POLICY "Approved partners can upload partner images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'partner-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

CREATE POLICY "Approved partners can update partner images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'partner-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

CREATE POLICY "Approved partners can delete partner images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'partner-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE user_id = auth.uid()
        AND status = 'APPROVED'
    )
  );

-- Keep public read access (unchanged)
-- Public can view offer images
CREATE POLICY "Public can view offer images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'offer-images');

-- Public can view partner images
CREATE POLICY "Public can view partner images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'partner-images');

-- ============================================================================
-- 3. REVOKE POINTS FUNCTION PERMISSIONS FROM REGULAR USERS
-- ============================================================================

-- CRITICAL: Prevent users from giving themselves unlimited points
REVOKE EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM anon;

-- Only service_role (backend) can modify points
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) TO service_role;

-- CRITICAL: Prevent users from claiming achievements arbitrarily
REVOKE EXECUTE ON FUNCTION claim_achievement(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION claim_achievement(UUID) FROM anon;

-- Only service_role can claim achievements
GRANT EXECUTE ON FUNCTION claim_achievement(UUID) TO service_role;

-- ============================================================================
-- 4. ADD INTERNAL VALIDATION TO CRITICAL FUNCTIONS
-- ============================================================================

-- Update add_user_points to validate caller matches user_id
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Only allow service_role to modify any user's points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify points';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    -- Create if doesn't exist
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
    -- Calculate and update
    v_new_balance := v_current_balance + p_amount;

    UPDATE user_points
    SET balance = v_new_balance
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update deduct_user_points to validate caller
CREATE OR REPLACE FUNCTION deduct_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Only allow service_role to deduct points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can deduct points';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has enough points
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User points record not found',
      'balance', 0
    );
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient SmartPoints',
      'balance', v_current_balance,
      'required', p_amount
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update balance
  UPDATE user_points
  SET balance = v_new_balance
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, -p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify storage bucket limits
DO $$
DECLARE
  v_offer_limit BIGINT;
  v_partner_limit BIGINT;
BEGIN
  SELECT file_size_limit INTO v_offer_limit FROM storage.buckets WHERE id = 'offer-images';
  SELECT file_size_limit INTO v_partner_limit FROM storage.buckets WHERE id = 'partner-images';

  RAISE NOTICE 'Offer images bucket limit: % bytes (should be 5242880)', v_offer_limit;
  RAISE NOTICE 'Partner images bucket limit: % bytes (should be 5242880)', v_partner_limit;

  IF v_offer_limit != 5242880 OR v_partner_limit != 5242880 THEN
    RAISE WARNING 'Storage bucket limits NOT updated correctly!';
  ELSE
    RAISE NOTICE '✅ Storage bucket limits updated successfully to 5MB';
  END IF;
END $$;

-- Verify storage policies
DO $$
DECLARE
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%Approved partners%';

  RAISE NOTICE 'Partner-only storage policies created: %', v_policy_count;

  IF v_policy_count >= 6 THEN
    RAISE NOTICE '✅ Storage policies restricted to approved partners only';
  ELSE
    RAISE WARNING 'Storage policies may not be correctly configured!';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Storage buckets limited to 5MB (was 50MB)
-- ✅ Storage MIME types restricted to match application (no GIF)
-- ✅ Storage uploads restricted to APPROVED PARTNERS ONLY
-- ✅ Points functions revoked from authenticated/anon users
-- ✅ Points functions now validate caller role internally
-- ✅ Achievement claiming restricted to service_role only
--
-- Security improvements:
-- - Prevents storage quota exhaustion
-- - Prevents unauthorized image uploads
-- - Prevents points manipulation exploits
-- - Enforces backend-only points management
-- ============================================================================
