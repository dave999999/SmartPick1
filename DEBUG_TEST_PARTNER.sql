-- ============================================================================
-- DEBUG: Check test partner's current state after recent changes
-- ============================================================================
-- Partner: 0f069ba3-2c87-44fe-99a0-97ba74532a86 (ა მარას სივერო)
-- ============================================================================

-- 1. Check partner basic info
SELECT 
  id,
  business_name,
  email,
  status,
  business_type,
  city,
  phone,
  created_at,
  updated_at
FROM public.partners
WHERE id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- 2. Check partner_points record (uses user_id column)
SELECT 
  user_id,
  balance,
  offer_slots,
  created_at,
  updated_at
FROM public.partner_points
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- 3. Check all transactions (uses partner_id column)
SELECT 
  id,
  partner_id,
  change,
  reason,
  balance_before,
  balance_after,
  metadata,
  created_at
FROM public.partner_point_transactions
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
ORDER BY created_at DESC;

-- 4. Calculate expected balance from transactions
SELECT 
  partner_id,
  SUM(change) as total_change,
  COUNT(*) as transaction_count,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction
FROM public.partner_point_transactions
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
GROUP BY partner_id;

-- 5. Check partner's active offers
SELECT 
  id,
  partner_id,
  title,
  status,
  smart_price,
  quantity_available,
  quantity_total,
  created_at
FROM public.offers
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
ORDER BY created_at DESC;

-- 6. Check if there are any reservations for this partner's offers
SELECT 
  r.id,
  r.offer_id,
  r.status,
  r.picked_up_at,
  r.user_confirmed_pickup,
  r.no_show,
  r.user_id,
  r.points_spent,
  r.created_at,
  o.title as offer_title,
  o.smart_price
FROM public.reservations r
JOIN public.offers o ON r.offer_id = o.id
WHERE o.partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
ORDER BY r.created_at DESC
LIMIT 10;

-- ============================================================================
-- ANALYSIS: Compare what should be vs what is
-- ============================================================================

DO $$
DECLARE
  v_partner_points RECORD;
  v_transaction_sum INT;
  v_balance_mismatch BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TEST PARTNER STATE ANALYSIS';
  RAISE NOTICE '============================================================';
  
  -- Get current partner_points
  SELECT balance, offer_slots INTO v_partner_points
  FROM public.partner_points
  WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
  
  IF v_partner_points IS NULL THEN
    RAISE NOTICE '❌ ERROR: No partner_points record found!';
    RAISE NOTICE 'This partner needs to be added to CREATE_MISSING_PARTNER_POINTS.sql';
  ELSE
    RAISE NOTICE '✅ Partner points record exists';
    RAISE NOTICE '   Current balance: % points', v_partner_points.balance;
    RAISE NOTICE '   Current slots: %', v_partner_points.offer_slots;
    
    -- Calculate sum from transactions
    SELECT COALESCE(SUM(change), 0) INTO v_transaction_sum
    FROM public.partner_point_transactions
    WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
    
    RAISE NOTICE '';
    RAISE NOTICE 'Transaction history sum: % points', v_transaction_sum;
    
    -- Check for mismatch (assuming started with 1000)
    IF v_partner_points.balance != (1000 + v_transaction_sum) THEN
      v_balance_mismatch := TRUE;
      RAISE NOTICE '⚠️  MISMATCH DETECTED!';
      RAISE NOTICE '   Expected: % points (1000 starting + % from transactions)', 
        (1000 + v_transaction_sum), v_transaction_sum;
      RAISE NOTICE '   Actual: % points', v_partner_points.balance;
      RAISE NOTICE '   Difference: % points', 
        (v_partner_points.balance - (1000 + v_transaction_sum));
    ELSE
      RAISE NOTICE '✅ Balance matches transaction history';
    END IF;
  END IF;
  
  RAISE NOTICE '============================================================';
END $$;
