/**
 * Apply fix for lift_cooldown_with_points duplicate key error
 * Run: npx tsx scripts/fix-lift-cooldown-duplicate.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SQL_FIX = `
DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID);

CREATE OR REPLACE FUNCTION lift_cooldown_with_points(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, points_spent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_user_points INTEGER;
  v_points_cost INTEGER := 100;
  v_georgia_date DATE;
  v_already_lifted BOOLEAN;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- ✅ FIX: Check if already lifted cooldown today
  SELECT EXISTS (
    SELECT 1 FROM user_cooldown_lifts
    WHERE user_id = p_user_id
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
  ) INTO v_already_lifted;
  
  IF v_already_lifted THEN
    RETURN QUERY SELECT FALSE, 'თქვენ უკვე მოხსენით შეზღუდვა დღეს'::TEXT, 0;
    RETURN;
  END IF;
  
  SELECT COUNT(*)
  INTO v_cancel_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  IF v_cancel_count < 4 THEN
    RETURN QUERY SELECT FALSE, 'არ გჭირდებათ შეზღუდვის მოხსნა'::TEXT, 0;
    RETURN;
  END IF;
  
  SELECT balance INTO v_user_points
  FROM user_points
  WHERE user_id = p_user_id;
  
  IF v_user_points IS NULL OR v_user_points < v_points_cost THEN
    RETURN QUERY SELECT FALSE, 'არასაკმარისი ბალანსი. საჭიროა 100 ქულა.'::TEXT, 0;
    RETURN;
  END IF;
  
  UPDATE user_points
  SET balance = balance - v_points_cost
  WHERE user_id = p_user_id;
  
  INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
  VALUES (p_user_id, v_cancel_count, 'paid', v_points_cost);
  
  RETURN QUERY SELECT TRUE, 'შეზღუდვა წარმატებით მოიხსნა! დახარჯული 100 ქულა.'::TEXT, v_points_cost;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 'თქვენ უკვე მოხსენით შეზღუდვა დღეს'::TEXT, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION lift_cooldown_with_points TO authenticated;
`;

async function applyFix() {
  console.log('🔧 Applying fix for lift_cooldown_with_points...\n');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: SQL_FIX });
    
    if (error) {
      // Try direct approach
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql: SQL_FIX })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      console.log('✅ Fix applied successfully!\n');
    } else {
      console.log('✅ Fix applied successfully!\n');
    }
    
    console.log('📝 Changes:');
    console.log('  • Added check for existing lift before INSERT');
    console.log('  • Returns proper error message if already lifted today');
    console.log('  • Added EXCEPTION handler for race conditions');
    console.log('  • No more 409 duplicate key errors\n');
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Manual Fix:');
    console.log('Run FIX_LIFT_COOLDOWN_DUPLICATE_ERROR.sql in Supabase SQL Editor');
    process.exit(1);
  }
}

applyFix();
