// Test BOG OAuth 2.0 token fetch
// This will help diagnose if your credentials work
// Deploy with: supabase functions deploy test-bog-oauth

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('test-bog-oauth');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const clientId = Deno.env.get("BOG_CLIENT_ID");
    const clientSecret = Deno.env.get("BOG_CLIENT_SECRET");
    const authUrl = Deno.env.get("BOG_AUTH_URL") || "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

    logger.info('Environment check', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: "Missing BOG credentials in Supabase environment variables",
        missing: {
          BOG_CLIENT_ID: !clientId,
          BOG_CLIENT_SECRET: !clientSecret
        },
        help: "Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables and add:\n" +
              "- BOG_CLIENT_ID = your_client_id_from_bog_portal\n" +
              "- BOG_CLIENT_SECRET = your_client_secret_from_bog_portal\n" +
              "- BOG_AUTH_URL = https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to fetch OAuth token
    const credentials = btoa(`${clientId}:${clientSecret}`);
    logger.info('Fetching OAuth token');

    const tokenResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenResponse.json();
    logger.info('Token response received', { status: tokenResponse.status, hasAccessToken: !!tokenData.access_token });

    if (!tokenResponse.ok) {
      return new Response(JSON.stringify({
        error: "BOG OAuth token fetch failed",
        status: tokenResponse.status,
        response: tokenData,
        possibleReasons: [
          "BOG merchant account not approved yet",
          "Wrong client_id or client_secret",
          "BOG API endpoint issue",
          "Network/firewall issue"
        ],
        whatToDo: "Contact BOG support to verify your merchant account status and credentials"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Success!
    return new Response(JSON.stringify({
      success: true,
      message: "✅ BOG OAuth is working!",
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      tokenPreview: tokenData.access_token?.substring(0, 50) + "...",
      nextStep: "Your BOG credentials are correct. The payment system should work now."
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('OAuth test failed', error);
    return new Response(JSON.stringify({
      error: "Test failed",
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
