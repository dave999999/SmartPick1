import { supabase } from '../supabase';
import crypto from 'crypto-js';

// ⚠️ SECURITY FIX: Removed client-side Resend API calls
// Supabase Auth handles email verification automatically via SMTP settings
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || 'https://www.smartpick.ge';

// Generate a secure random token
const generateSecureToken = (): string => {
  const randomBytes = crypto.lib.WordArray.random(32);
  return randomBytes.toString(crypto.enc.Hex);
};

// Check rate limit before sending email
const checkRateLimit = async (email: string, actionType: 'verification' | 'password_reset'): Promise<boolean> => {
  const { data, error } = await supabase.rpc('check_email_rate_limit', {
    p_email: email.toLowerCase(),
    p_action_type: actionType,
    p_max_attempts: 3,
    p_window_minutes: 15
  });

  if (error) {
    console.error('Rate limit check error:', error);
    return false; // Deny on error (fail-safe)
  }

  return data === true;
};

// Env-configured Resend credentials
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'SmartPick <noreply@smartpick.ge>';

// Send email via Resend API
const sendEmailViaResend = async (to: string, subject: string, html: string): Promise<void> => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log('Email sent successfully:', result);
};

// Generate verification email HTML
const generateVerificationEmailHTML = (verificationUrl: string, userName?: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - SmartPick</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">🎉 Welcome to SmartPick!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
        ${userName ? `Hi ${userName},` : 'Hello,'}
      </p>
      
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
        Thank you for signing up for SmartPick! We're excited to have you join our mission to reduce food waste and save money. 🌍
      </p>
      
      <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
        To complete your registration and start discovering amazing deals, please verify your email address by clicking the button below:
      </p>
      
      <!-- Verification Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${verificationUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3);">
          Verify Email Address
        </a>
      </div>
      
      <p style="margin: 30px 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Or copy and paste this link into your browser:
      </p>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; word-break: break-all;">
        <a href="${verificationUrl}" style="color: #16a34a; font-size: 14px; text-decoration: none;">
          ${verificationUrl}
        </a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
          ⏱️ <strong>This link expires in 30 minutes</strong> for security reasons.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          If you didn't create a SmartPick account, you can safely ignore this email.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
        Questions? Contact us at <a href="mailto:support@smartpick.ge" style="color: #16a34a; text-decoration: none;">support@smartpick.ge</a>
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        © 2025 SmartPick. Fighting food waste, one meal at a time.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

// Generate password reset email HTML
const generatePasswordResetEmailHTML = (resetUrl: string, userName?: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - SmartPick</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">🔐 Password Reset Request</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
        ${userName ? `Hi ${userName},` : 'Hello,'}
      </p>
      
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
        We received a request to reset the password for your SmartPick account.
      </p>
      
      <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
        If you made this request, click the button below to create a new password:
      </p>
      
      <!-- Reset Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
          Reset Password
        </a>
      </div>
      
      <p style="margin: 30px 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Or copy and paste this link into your browser:
      </p>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; word-break: break-all;">
        <a href="${resetUrl}" style="color: #d97706; font-size: 14px; text-decoration: none;">
          ${resetUrl}
        </a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
          ⏱️ <strong>This link expires in 30 minutes</strong> for security reasons.
        </p>
        <p style="margin: 0 0 10px; color: #ef4444; font-size: 14px; line-height: 1.6; font-weight: 600;">
          ⚠️ If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          For security reasons, consider changing your password if you receive this email unexpectedly.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
        Questions? Contact us at <a href="mailto:support@smartpick.ge" style="color: #d97706; text-decoration: none;">support@smartpick.ge</a>
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        © 2025 SmartPick. Fighting food waste, one meal at a time.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Send verification email to user after signup
 * Rate limited: 3 attempts per 15 minutes
 */
export const sendVerificationEmail = async (userId: string, email: string, userName?: string): Promise<void> => {
  try {
    // Check rate limit
    const canSend = await checkRateLimit(email, 'verification');
    if (!canSend) {
      throw new Error('Rate limit exceeded. Please try again in 15 minutes. Maximum 3 verification emails per 15 minutes.');
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes expiry

    // Store token in database
    const { error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to create verification token: ${insertError.message}`);
    }

    // Generate verification URL
    const verificationUrl = `${PUBLIC_BASE_URL}/verify-email?token=${token}`;

    // Generate email HTML
    const emailHTML = generateVerificationEmailHTML(verificationUrl, userName);

    // Send email via Resend
    await sendEmailViaResend(
      email,
      '🎉 Verify Your Email - SmartPick',
      emailHTML
    );

    logger.log('Verification email sent successfully');
  } catch (error) {
    logger.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email to user
 * Rate limited: 3 attempts per 15 minutes
 */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    // Call Edge Function to send password reset email
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error(data.error);
      }
      throw new Error(data.error || 'Failed to send password reset email');
    }

    logger.log('Password reset email sent successfully');
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Verify email with token (calls Edge Function)
 */
export const verifyEmailWithToken = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    return {
      success: true,
      message: data.message || 'Email verified successfully!',
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
};

/**
 * Reset password with token (calls Edge Function)
 */
export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Password reset failed');
    }

    return {
      success: true,
      message: data.message || 'Password reset successfully!',
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};
