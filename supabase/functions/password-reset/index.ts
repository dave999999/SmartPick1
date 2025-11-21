import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { validatePassword, getPasswordErrorMessage } from '../_shared/password-validator.ts';

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

interface SuccessResponse {
  success: true;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Parse request body
    const { token, newPassword }: ResetPasswordRequest = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token is required', code: 'MISSING_TOKEN' } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: getPasswordErrorMessage(passwordValidation), 
          code: 'INVALID_PASSWORD' 
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Find the token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null) // Only unused tokens
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired reset token', 
          code: 'INVALID_TOKEN' 
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token has expired (30 minutes)
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          error: 'Reset token has expired. Please request a new one.', 
          code: 'TOKEN_EXPIRED' 
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's password using Supabase Admin API
    const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(
      tokenRecord.user_id,
      { password: newPassword }
    );

    if (updatePasswordError) {
      console.error('Error updating password:', updatePasswordError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to reset password', 
          code: 'PASSWORD_UPDATE_ERROR' 
        } as ErrorResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabase
      .from('password_reset_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
      .eq('id', tokenRecord.id);

    if (updateTokenError) {
      console.error('Error marking token as used:', updateTokenError);
      // Don't fail the request since password was already updated
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully! You can now log in with your new password.' 
      } as SuccessResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in password-reset function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred', 
        code: 'INTERNAL_ERROR' 
      } as ErrorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
