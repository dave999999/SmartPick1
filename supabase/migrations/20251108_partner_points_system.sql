-- Partner Points System Migration
-- 1. Create partner_points and partner_point_transactions tables
-- 2. Grant 1000 points to partners on approval
-- 3. Add offer_slots tracking (default 4 slots)
-- 4. Enable point transfer on pickup

BEGIN;

-- ============================================
-- STEP 1: Partner Points Tables
-- ============================================

-- Partner points balance table
CREATE TABLE IF NOT EXISTS public.partner_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  offer_slots INT NOT NULL DEFAULT 4 CHECK (offer_slots >= 4 AND offer_slots <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partner point transactions log
CREATE TABLE IF NOT EXISTS public.partner_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change INT NOT NULL, -- positive for credits, negative for debits
  reason TEXT NOT NULL, -- 'WELCOME', 'PICKUP_REWARD', 'SLOT_PURCHASE', etc.
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_points_user_id ON public.partner_points(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_partner_id ON public.partner_point_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_created_at ON public.partner_point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_reason ON public.partner_point_transactions(reason);

-- Comments
COMMENT ON TABLE public.partner_points IS 'Partner SmartPoints balance and offer slot allocation';
COMMENT ON TABLE public.partner_point_transactions IS 'Audit log for all partner point movements';

-- ============================================
-- STEP 2: Row Level Security
-- ============================================

ALTER TABLE public.partner_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions ENABLE ROW LEVEL SECURITY;

-- Partners can view their own points
CREATE POLICY "Partners view own points"
  ON public.partner_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Partners can view their own transactions
CREATE POLICY "Partners view own transactions"
  ON public.partner_point_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = partner_id);

-- Service role can do everything
CREATE POLICY "Service role full access to partner points"
  ON public.partner_points FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to partner transactions"
  ON public.partner_point_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STEP 3: Helper Function - Add Partner Points
-- ============================================

CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Validation
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount cannot be zero');
  END IF;
  
  IF p_amount > 10000 OR p_amount < -10000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount too large');
  END IF;

  -- Lock and fetch current balance
  SELECT balance INTO v_current_balance
  FROM public.partner_points
  WHERE user_id = p_partner_id
  FOR UPDATE;

  -- Initialize if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO public.partner_points (user_id, balance)
    VALUES (p_partner_id, GREATEST(0, p_amount))
    RETURNING balance INTO v_new_balance;
    
    v_current_balance := 0;
  ELSE
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Prevent negative balance
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_current_balance, 'required', ABS(p_amount));
    END IF;
    
    -- Update balance
    UPDATE public.partner_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_partner_id;
  END IF;

  -- Log transaction
  INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_partner_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

COMMENT ON FUNCTION public.add_partner_points IS 'Securely add/deduct partner points with transaction logging';
GRANT EXECUTE ON FUNCTION public.add_partner_points(UUID, INT, TEXT, JSONB) TO service_role;

-- ============================================
-- STEP 4: Grant Welcome Points on Partner Approval
-- ============================================

CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    -- Initialize partner_points with 1000 welcome bonus
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 4)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log the welcome bonus
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.user_id, 1000, 'WELCOME', 0, 1000, jsonb_build_object('partner_id', NEW.id, 'business_name', NEW.business_name))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to partners table
DROP TRIGGER IF EXISTS trg_partner_welcome_points ON public.partners;
CREATE TRIGGER trg_partner_welcome_points
AFTER INSERT OR UPDATE OF status ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.grant_partner_welcome_points();

-- ============================================
-- STEP 5: Backfill Existing Approved Partners
-- ============================================

DO $$
DECLARE
  v_partner RECORD;
BEGIN
  FOR v_partner IN
    SELECT id, user_id, business_name
    FROM public.partners
    WHERE status = 'APPROVED'
  LOOP
    -- Initialize points if not exists
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (v_partner.user_id, 1000, 4)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log transaction if not logged
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    SELECT v_partner.user_id, 1000, 'WELCOME_BACKFILL', 0, 1000, jsonb_build_object('partner_id', v_partner.id, 'business_name', v_partner.business_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.partner_point_transactions
      WHERE partner_id = v_partner.user_id AND reason IN ('WELCOME', 'WELCOME_BACKFILL')
    );
  END LOOP;
  
  RAISE NOTICE 'Backfilled partner points for existing approved partners';
END;
$$;

-- ============================================
-- STEP 6: Purchase Additional Offer Slot
-- ============================================

CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID := auth.uid();
  v_current_slots INT;
  v_current_balance INT;
  v_cost INT;
  v_new_balance INT;
BEGIN
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Lock and fetch partner points
  SELECT offer_slots, balance INTO v_current_slots, v_current_balance
  FROM public.partner_points
  WHERE user_id = v_partner_id
  FOR UPDATE;

  IF v_current_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner points not initialized');
  END IF;

  -- Check max slots
  IF v_current_slots >= 50 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum slots reached (50)');
  END IF;

  -- Calculate cost: 5th slot = 50, 6th = 100, 7th = 150, etc.
  -- Formula: (slot_number - 4) * 50
  v_cost := (v_current_slots - 3) * 50;

  -- Check balance
  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_current_balance, 'cost', v_cost);
  END IF;

  -- Deduct points
  v_new_balance := v_current_balance - v_cost;
  
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_partner_id;

  -- Log transaction
  INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (v_partner_id, -v_cost, 'SLOT_PURCHASE', v_current_balance, v_new_balance, jsonb_build_object('slot_number', v_current_slots + 1, 'cost', v_cost));

  RETURN jsonb_build_object(
    'success', true,
    'new_slots', v_current_slots + 1,
    'cost', v_cost,
    'balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_partner_offer_slot IS 'Purchase an additional offer slot with escalating cost';
GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot() TO authenticated;

-- ============================================
-- STEP 7: Offer Slot Validation
-- ============================================

CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_partner_id UUID;
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get partner user_id from the offer
  SELECT user_id INTO v_partner_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  -- Get max allowed slots
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = v_partner_id;

  -- Default to 4 if not found
  v_max_slots := COALESCE(v_max_slots, 4);

  -- Count current active/scheduled offers (excluding the one being inserted/updated)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id <> NEW.id; -- Exclude current row for updates

  -- Check limit
  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % slots. Purchase more slots to add offers.', v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to offers table (only for new offers or reactivation)
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;
CREATE TRIGGER trg_check_partner_offer_slots
BEFORE INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.check_partner_offer_slots();

COMMIT;
