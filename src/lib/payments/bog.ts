/**
 * Bank of Georgia (BOG) Payments API Integration
 * 
 * This module handles integration with BOG's E-Commerce payment gateway using OAuth 2.0.
 * 
 * Environment Variables Required:
 * - BOG_CLIENT_ID: OAuth client ID (Public Key) from BOG E-Commerce panel (e.g., 10002951)
 * - BOG_CLIENT_SECRET: OAuth client secret (Secret Key) from BOG E-Commerce panel
 * - BOG_AUTH_URL: OAuth token endpoint (https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token)
 * - BOG_PAYMENTS_API_URL: BOG E-Commerce API endpoint (https://api.bog.ge/payments/v1/ecommerce/orders)
 * - BOG_CALLBACK_URL: Webhook callback URL
 * - PUBLIC_BASE_URL: Your application's base URL
 */

// Type declaration for Deno (available in Edge Functions, not in browser)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
} | undefined;

// Simple logger for Deno compatibility
const log = {
  log: (...args: unknown[]) => console.log('[BOG]', ...args),
  error: (...args: unknown[]) => console.error('[BOG ERROR]', ...args),
  warn: (...args: unknown[]) => console.warn('[BOG WARN]', ...args),
};

export interface BOGConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  paymentsApiUrl: string;
  baseUrl: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export interface PaymentSession {
  sessionId: string;
  redirectUrl: string;
  orderId: string;
  expiresAt?: string;
}

export interface BOGPaymentStatusResponse {
  payment_id: string;
  status: string;
  amount?: number;
  currency?: string;
  order_id?: string;
  transaction_id?: string;
}

export interface PaymentSessionRequest {
  amount: number; // in GEL
  currency: "GEL";
  orderId: string; // our internal order ID
  userId: string;
  returnUrl: string;
  callbackUrl: string; // webhook URL
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface BOGWebhookBody {
  order_id?: string;
  orderId?: string;
  transaction_id?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface ParsedWebhookData {
  orderId: string;
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  status: string; // raw BOG status
}

export class BOGPaymentClient {
  private config: BOGConfig;
  private tokenCache: CachedToken | null = null;

  constructor(config: BOGConfig) {
    this.config = config;
  }

  /**
   * Get OAuth 2.0 access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60000) {
      log.log('Using cached OAuth token');
      return this.tokenCache.token;
    }

    try {
      log.log('Fetching new OAuth token from BOG');

      // Create Basic Auth header: Base64(client_id:client_secret)
      const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

      const response = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const error = await response.text();
        log.error('OAuth token request failed:', response.status, error);
        throw new Error(`Failed to get OAuth token: ${response.status} - ${error}`);
      }

      const data: TokenResponse = await response.json();
      
      // Cache token with expiration time
      this.tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      log.log('OAuth token obtained successfully, expires in', data.expires_in, 'seconds');
      return data.access_token;
    } catch (error) {
      log.error('Failed to get OAuth token:', error);
      throw error;
    }
  }

  /**
   * Create a payment session with BOG E-Commerce API
   * Uses OAuth 2.0 Bearer token authentication
   */
  async createPaymentSession(request: PaymentSessionRequest): Promise<PaymentSession> {
    try {
      log.log('Creating payment session', {
        orderId: request.orderId,
        amount: request.amount,
      });

      // Get OAuth token first
      const accessToken = await this.getAccessToken();

      // BOG E-Commerce API payload structure (no credentials here)
      const payload = {
        callback_url: request.callbackUrl,
        external_order_id: request.orderId,
        purchase_units: {
          currency: request.currency,
          total_amount: request.amount.toFixed(2),
          basket: [
            {
              quantity: 1,
              unit_price: request.amount.toFixed(2),
              product_id: 'SMARTPOINTS',
              description: request.description || `SmartPoints Purchase - ${request.metadata?.points || 0} points`
            }
          ]
        },
        redirect_urls: {
          fail: request.returnUrl.replace('success', 'failed'),
          success: request.returnUrl
        }
      };

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'ka',
      };

      const response = await fetch(this.config.paymentsApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        log.error('Payment session creation failed:', response.status, error);
        throw new Error(`Failed to create payment session: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      log.log('Payment session created:', {
        sessionId: data.payment_id || data.id || data.session_id,
        orderId: request.orderId,
      });

      // Handle different possible response field names
      return {
        sessionId: data.payment_id || data.id || data.session_id,
        redirectUrl: data.redirect_url || data.payment_url || data.url,
        orderId: request.orderId,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      log.error('Create payment session error:', error);
      throw error;
    }
  }

  /**
   * Parse and validate webhook data from BOG
   */
  parseWebhookData(body: BOGWebhookBody): ParsedWebhookData & { status: string } {
    // Parse BOG webhook payload structure
    return {
      orderId: body.order_id || body.orderId || '',
      transactionId: body.transaction_id || body.transactionId || null,
      amount: body.amount ? body.amount / 100 : null, // Convert tetri to GEL
      currency: body.currency || 'GEL',
      status: body.status || 'UNKNOWN',
    };
  }

  /**
   * Map BOG payment status to our internal status
   * Made public so webhook can use it
   */
  mapBOGStatus(bogStatus: string): { status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING' } {
    const statusMap: Record<string, 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING'> = {
      'SUCCEEDED': 'SUCCESS',
      'SUCCESS': 'SUCCESS',
      'COMPLETED': 'SUCCESS',
      'PAID': 'SUCCESS',
      'FAILED': 'FAILED',
      'DECLINED': 'FAILED',
      'ERROR': 'FAILED',
      'CANCELLED': 'CANCELLED',
      'CANCELED': 'CANCELLED',
      'PENDING': 'PENDING',
      'PROCESSING': 'PENDING',
      'CREATED': 'PENDING',
    };

    const mapped = statusMap[bogStatus?.toUpperCase()] || 'FAILED';
    return { status: mapped };
  }

  /**
   * Get payment status by payment ID (optional - for polling if needed)
   */
  async getPaymentStatus(paymentId: string): Promise<BOGPaymentStatusResponse> {
    try {
      // Use OAuth 2.0 Bearer token like other endpoints
      const accessToken = await this.getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      };

      const response = await fetch(`${this.config.paymentsApiUrl}/${paymentId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log.error('Get payment status error:', error);
      throw error;
    }
  }
}

/**
 * Create BOG client instance with environment variables
 * Use this in Supabase Edge Functions
 */
export function createBOGClient(): BOGPaymentClient {
  // Type-safe Deno env access (this function is used in Edge Functions only)
  const getEnv = (key: string): string | undefined => {
    // @ts-ignore - Deno is available in Edge Functions runtime
    if (typeof Deno !== 'undefined') {
      // @ts-ignore - Deno is available in Edge Functions runtime
      return Deno.env.get(key);
    }
    return undefined;
  };

  const config: BOGConfig = {
    clientId: getEnv('BOG_CLIENT_ID') || '',
    clientSecret: getEnv('BOG_CLIENT_SECRET') || '',
    authUrl: getEnv('BOG_AUTH_URL') || 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
    paymentsApiUrl: getEnv('BOG_PAYMENTS_API_URL') || 'https://api.bog.ge/payments/v1/ecommerce/orders',
    baseUrl: getEnv('PUBLIC_BASE_URL') || 'http://localhost:5173',
  };

  // Validate required config
  if (!config.clientId || !config.clientSecret) {
    throw new Error('BOG_CLIENT_ID and BOG_CLIENT_SECRET are required');
  }

  return new BOGPaymentClient(config);
}

/**
 * Browser-compatible helper for frontend
 */
export const BOG_CONFIG = {
  // Default point to GEL conversion rate
  POINTS_PER_GEL: 100,
  
  // Predefined packages
  PACKAGES: [
    { points: 100, gel: 1, label: 'Micro' },
    { points: 200, gel: 2, label: 'Small' },
    { points: 500, gel: 5, label: 'Starter' },
    { points: 1000, gel: 10, label: 'Popular', badge: 'Most Popular' },
    { points: 2500, gel: 25, label: 'Value', badge: 'Best Value' },
    { points: 5000, gel: 50, label: 'Premium' },
  ],
  
  // Limits
  MIN_GEL: 1,
  MAX_GEL: 50,
  MIN_POINTS: 100,
  MAX_POINTS: 5000,
};
