/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAINTENANCE_MODE: string
  readonly VITE_TURNSTILE_SITE_KEY: string
  // ⚠️ REMOVED: VITE_RESEND_API_KEY (security fix - was exposing secret)
  readonly VITE_PUBLIC_BASE_URL: string
  readonly BOG_CLIENT_ID: string
  readonly BOG_CLIENT_SECRET: string
  readonly BOG_AUTH_URL: string
  readonly BOG_PAYMENTS_API_URL: string
  readonly BOG_REDIRECT_URI: string
  readonly BOG_CALLBACK_URL: string
  readonly TELEGRAM_BOT_TOKEN: string
  readonly TELEGRAM_WEBHOOK_SECRET: string
  readonly RATE_LIMIT_WINDOW_MS: string
  readonly RATE_LIMIT_MAX_REQUESTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
