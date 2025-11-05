-- SmartPoints System Tables
-- Migration: Create user_points and point_transactions tables

-- 1. Create user_points table
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- 2. Create point_transactions table for audit trail
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change INT NOT NULL, -- positive for additions, negative for deductions
  reason TEXT NOT NULL, -- 'registration', 'reservation', 'purchase', 'refund', 'admin_adjustment', etc.
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  metadata JSONB, -- extra data (reservation_id, payment_id, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);

-- 3. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_points_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_user_points_timestamp_trigger
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_timestamp();

-- 4. Function to auto-create 100 points for new users
CREATE OR REPLACE FUNCTION init_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert 100 starting points
  INSERT INTO user_points (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  -- Log the transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (NEW.id, 100, 'registration', 0, 100, jsonb_build_object('welcome_bonus', true));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create points when user registers
CREATE TRIGGER create_user_points_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_points();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own points
CREATE POLICY "Users can view their own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON point_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can modify points (via Edge Functions)
CREATE POLICY "Service role can modify points"
  ON user_points FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can create transactions"
  ON point_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 6. Function to safely deduct points (with transaction safety)
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
BEGIN
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

-- 7. Function to safely add points
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
BEGIN
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

-- 8. Grant necessary permissions
GRANT SELECT ON user_points TO authenticated;
GRANT SELECT ON point_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_points TO service_role;
GRANT EXECUTE ON FUNCTION add_user_points TO service_role;

-- Comments for documentation
COMMENT ON TABLE user_points IS 'Stores current SmartPoints balance for each user';
COMMENT ON TABLE point_transactions IS 'Audit log of all point additions and deductions';
COMMENT ON FUNCTION init_user_points IS 'Auto-creates 100 starting points for new users';
COMMENT ON FUNCTION deduct_user_points IS 'Safely deducts points with transaction logging';
COMMENT ON FUNCTION add_user_points IS 'Safely adds points with transaction logging';
