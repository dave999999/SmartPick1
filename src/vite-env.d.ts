/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAINTENANCE_MODE: string
  readonly VITE_TURNSTILE_SITE_KEY: string
  // ⚠️ REMOVED: VITE_RESEND_API_KEY (security fix - was exposing secret)
  // ⚠️ REMOVED: BOG_CLIENT_SECRET (security fix - moved to Edge Functions only)
  // ⚠️ REMOVED: TELEGRAM_BOT_TOKEN (security fix - should never be in client)
  // ⚠️ REMOVED: TELEGRAM_WEBHOOK_SECRET (security fix - should never be in client)
  readonly VITE_PUBLIC_BASE_URL: string
  readonly RATE_LIMIT_WINDOW_MS: string
  readonly RATE_LIMIT_MAX_REQUESTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
