import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface SendVerificationEmailRequest {
  email: string;
  name: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, name, userId }: SendVerificationEmailRequest = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
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
      p_action_type: 'email_verification',
      p_max_attempts: 3,
      p_window_minutes: 15
    });

    if (!canSendEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification email requests. Please try again in 15 minutes.',
          code: 'EMAIL_RATE_LIMIT'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IP-based rate limiting: 10 per 15 minutes per IP
    const { data: canSendIP } = await supabase.rpc('check_email_rate_limit', {
      p_email: ipAddress,
      p_action_type: 'email_verification_ip',
      p_max_attempts: 10,
      p_window_minutes: 15
    });

    if (!canSendIP) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification requests from your location. Please try again in 15 minutes.',
          code: 'IP_RATE_LIMIT'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate verification token
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create token in database
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (tokenError) {
      console.error('Error creating verification token:', tokenError);
      throw new Error('Failed to create verification token');
    }

    // Generate verification URL
    const verificationUrl = `${publicBaseUrl}/verify-email?token=${token}`;

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
        subject: '✅ Verify Your Email - SmartPick',
        html: generateVerificationEmail(verificationUrl, name),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error('Failed to send verification email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateVerificationEmail(verificationUrl: string, userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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
                <span style="font-size: 48px;">✅</span>
              </div>
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Verify Your Email</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px; color: #1a202c; font-size: 18px; line-height: 1.6;">
                Hi ${userName || 'there'} 👋
              </p>
              
              <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Welcome to SmartPick! We're excited to have you on board. Please verify your email address to complete your registration and start discovering amazing food deals near you.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #4CC9A8 0%, #38b39a 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(76, 201, 168, 0.4); transition: transform 0.2s;">
                      Verify Email →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background: #f7fafc; border-left: 4px solid #4CC9A8; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
                <p style="margin: 0 0 12px; color: #2d3748; font-size: 14px; font-weight: 600;">
                  ⏰ Important:
                </p>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
                  This verification link expires in <strong>30 minutes</strong> for security reasons.
                </p>
              </div>

              <p style="margin: 0 0 16px; color: #4a5568; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px; color: #4CC9A8; font-size: 13px; word-break: break-all; background: #f7fafc; padding: 12px; border-radius: 6px;">
                ${verificationUrl}
              </p>

              <div style="background: linear-gradient(135deg, rgba(76, 201, 168, 0.1) 0%, rgba(56, 179, 154, 0.1) 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <p style="margin: 0 0 16px; color: #2d3748; font-size: 16px; font-weight: 600;">
                  🎁 What's next?
                </p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                  <li>Discover restaurants offering up to 50% off surplus food</li>
                  <li>Save money on delicious meals from local businesses</li>
                  <li>Help reduce food waste and support sustainability</li>
                  <li>Earn SmartPoints with every purchase</li>
                </ul>
              </div>

              <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
                <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.6;">
                  <strong>Didn't create an account?</strong><br>
                  If you didn't sign up for SmartPick, you can safely ignore this email.
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
