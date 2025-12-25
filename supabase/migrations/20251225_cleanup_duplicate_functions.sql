-- ============================================
-- CLEANUP: Remove old function versions
-- These are duplicate/old versions with incorrect search_path
-- ============================================

-- Drop OLD versions (the ones with "NOT SET" or wrong search_path)
DROP FUNCTION IF EXISTS public.claim_achievement(p_achievement_id text) CASCADE;
DROP FUNCTION IF EXISTS public.create_reservation_atomic(p_offer_id uuid, p_customer_id uuid, p_quantity integer, p_qr_code text, p_total_price numeric, p_expires_at timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.create_reservation_atomic(p_offer_id uuid, p_user_id uuid, p_quantity integer, p_points_cost integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_security_alert(p_partner_id uuid, p_alert_type text, p_description text, p_severity text, p_metadata jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_upload_attempt(p_partner_id uuid, p_file_name text, p_file_size bigint, p_file_type text, p_bucket_name text, p_success boolean, p_error_message text) CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation() CASCADE;
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(p_reservation_id uuid, p_user_id uuid, p_reason text) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_reliability_score(p_user_id uuid, p_action character varying) CASCADE;

-- Note: We're keeping the versions with correct search_path=public, pg_catalog:
-- ✓ claim_achievement(p_user_id uuid, p_achievement_id text, p_points_reward integer)
-- ✓ create_reservation_atomic(p_offer_id uuid, p_quantity integer, p_qr_code text, p_total_price numeric, p_expires_at timestamp with time zone)
-- ✓ create_security_alert(p_partner_id uuid, p_alert_type text, p_details jsonb)
-- ✓ lift_cooldown_with_points(p_user_id uuid, p_points_cost integer)
-- ✓ log_upload_attempt(p_partner_id uuid, p_success boolean, p_error_message text)
-- ✓ track_reservation_cancellation(p_user_id uuid)
-- ✓ update_user_reliability_score(p_user_id uuid, p_delta integer)
