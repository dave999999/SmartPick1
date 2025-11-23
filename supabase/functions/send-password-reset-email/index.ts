import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SendResetEmailRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email }: SendResetEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const publicBaseUrl = Deno.env.get('PUBLIC_BASE_URL') || 'https://www.smartpick.ge';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP address for rate limiting
    const ipAddress = 
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown';

    // Email-based rate limiting: 3 per 15 minutes per email
    const { data: canSendEmail } = await supabase.rpc('check_email_rate_limit', {
      p_email: email,
      p_action_type: 'password_reset',
      p_max_attempts: 3,
      p_window_minutes: 15
    });

    if (!canSendEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many password reset requests for this email. Please try again in 15 minutes.',
          code: 'EMAIL_RATE_LIMIT'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IP-based rate limiting: 10 per 15 minutes per IP (prevents multi-email spam)
    const { data: canSendIP } = await supabase.rpc('check_email_rate_limit', {
      p_email: ipAddress,
      p_action_type: 'password_reset_ip',
      p_max_attempts: 10,
      p_window_minutes: 15
    });

    if (!canSendIP) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many password reset requests from your location. Please try again in 15 minutes.',
          code: 'IP_RATE_LIMIT'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user by email
    const startTime = Date.now();
    const { data: users } = await supabase.rpc('get_user_by_email', { p_email: email });

    if (!users || users.length === 0) {
      // Security: Add constant-time delay to prevent timing attacks
      // Simulate the time it would take to process a real request (200-400ms)
      const elapsedTime = Date.now() - startTime;
      const targetTime = 300; // Target 300ms total response time
      const remainingTime = Math.max(0, targetTime - elapsedTime);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Security: Don't reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: 'If the email exists, a reset link will be sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users[0];

    // Check if user is OAuth-only (Google, Facebook, etc.) by checking auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.user_id);
    
    if (!authError && authUser?.user) {
      // Check if this is an OAuth account (has providers other than email)
      const providers = authUser.user.app_metadata?.providers || [];
      const hasOAuthProvider = providers.some((p: string) => p !== 'email');
      
      if (hasOAuthProvider) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'This account uses social login (Google/Facebook). Please sign in using the same method you used to create your account.',
            code: 'OAUTH_ACCOUNT'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate token
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create token in database
    await supabase.rpc('create_password_reset_token', {
      p_user_id: user.user_id,
      p_token: token,
      p_expires_at: expiresAt.toISOString()
    });

    // Generate reset URL
    const resetUrl = `${publicBaseUrl}/reset-password?token=${token}`;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'SmartPick <no-reply@smartpick.ge>',
        to: [email],
        subject: '🔐 Reset Your Password - SmartPick',
        html: generatePasswordResetEmail(resetUrl, user.full_name),
      }),
    });

    if (!emailResponse.ok) {
      console.error('Resend API error:', await emailResponse.text());
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePasswordResetEmail(resetUrl: string, userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #4CC9A8 0%, #38b39a 100%); padding: 48px 40px; text-align: center;">
              <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                <span style="font-size: 48px;">🔐</span>
              </div>
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Reset Your Password</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px; color: #1a202c; font-size: 18px; line-height: 1.6;">
                Hi ${userName || 'there'} 👋
              </p>
              
              <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                We received a request to reset your SmartPick password. Click the button below to create a new password:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4CC9A8 0%, #38b39a 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 201, 168, 0.4); transition: transform 0.2s;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background: #f7fafc; border-left: 4px solid #4CC9A8; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
                <p style="margin: 0 0 12px; color: #2d3748; font-size: 14px; font-weight: 600;">
                  ⏰ Important:
                </p>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
                  This link expires in <strong>30 minutes</strong> for security reasons.
                </p>
              </div>

              <p style="margin: 0 0 16px; color: #4a5568; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px; color: #4CC9A8; font-size: 13px; word-break: break-all; background: #f7fafc; padding: 12px; border-radius: 6px;">
                ${resetUrl}
              </p>

              <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
                <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.6;">
                  <strong>Didn't request this?</strong><br>
                  If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f7fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px; color: #4a5568; font-size: 16px; font-weight: 600;">
                🌱 SmartPick
              </p>
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.5;">
                Reducing food waste, one meal at a time
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
