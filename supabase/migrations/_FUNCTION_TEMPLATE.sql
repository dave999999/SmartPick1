-- ============================================================================
-- TEMPLATE: Copy this for all new functions
-- Rename file: YYYYMMDD_descriptive_name.sql
-- ============================================================================

-- Drop existing if needed
DROP FUNCTION IF EXISTS public.your_function_name(param_type);

-- Create secure function
CREATE OR REPLACE FUNCTION public.your_function_name(
  p_param1 TYPE,
  p_param2 TYPE DEFAULT NULL
)
RETURNS return_type  -- JSONB, TEXT, UUID, VOID, etc.
LANGUAGE plpgsql
SECURITY DEFINER  -- Required for bypassing RLS
SET search_path = public, pg_temp  -- CRITICAL: Always include both!
AS $$
DECLARE
  -- Declare variables here if needed
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user (if needed)
  v_user_id := auth.uid();
  
  -- Validate inputs
  IF p_param1 IS NULL THEN
    RAISE EXCEPTION 'Parameter cannot be null';
  END IF;
  
  -- Check authorization (if needed)
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = v_user_id AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Main logic here
  -- ALWAYS use fully qualified names:
  INSERT INTO public.your_table (column1, column2)
  VALUES (p_param1, p_param2);
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Operation completed'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle errors gracefully
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.your_function_name TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.your_function_name TO anon;  -- Only if needed

-- Add documentation
COMMENT ON FUNCTION public.your_function_name IS 
'Description of what this function does.
Parameters:
  - p_param1: Description
  - p_param2: Description
Returns: JSONB with success/error status
Security: SECURITY DEFINER with search_path set';

-- ============================================================================
-- TEST SECTION (remove before committing)
-- ============================================================================

-- Test 1: Basic functionality
-- SELECT public.your_function_name('test_value', 'test_value2');

-- Test 2: Null handling
-- SELECT public.your_function_name(NULL);

-- Test 3: Verify security settings
-- SELECT 
--   proname as function_name,
--   prosecdef as is_security_definer,
--   proconfig as search_path_config
-- FROM pg_proc 
-- WHERE proname = 'your_function_name'
--   AND pronamespace = 'public'::regnamespace;
