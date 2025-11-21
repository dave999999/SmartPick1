import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface VerifyEmailRequest {
  token: string;
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
    const { token }: VerifyEmailRequest = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token is required', code: 'MISSING_TOKEN' } as ErrorResponse),
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
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null) // Only unused tokens
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired verification token', 
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
          error: 'Verification token has expired. Please request a new one.', 
          code: 'TOKEN_EXPIRED' 
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
      .eq('id', tokenRecord.id);

    if (updateTokenError) {
      console.error('Error marking token as used:', updateTokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to process verification', code: 'UPDATE_ERROR' } as ErrorResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's email verification status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('id', tokenRecord.user_id);

    if (updateUserError) {
      console.error('Error updating user verification status:', updateUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify email', code: 'USER_UPDATE_ERROR' } as ErrorResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verified successfully! You can now close this page.' 
      } as SuccessResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in verify-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred', 
        code: 'INTERNAL_ERROR' 
      } as ErrorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
