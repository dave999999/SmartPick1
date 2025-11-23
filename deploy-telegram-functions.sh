#!/bin/bash
# Deploy both Telegram Edge Functions to Supabase

echo "==================================="
echo "Deploying Telegram Edge Functions"
echo "==================================="

# Deploy telegram-webhook
echo ""
echo "1. Deploying telegram-webhook..."
supabase functions deploy telegram-webhook --no-verify-jwt

# Deploy send-notification
echo ""
echo "2. Deploying send-notification..."
supabase functions deploy send-notification

echo ""
echo "==================================="
echo "✅ Deployment Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Verify functions in Supabase Dashboard > Edge Functions"
echo "2. Test Telegram webhook with: curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/telegram-webhook"
echo "3. Connect Telegram in app: Profile > Settings > Telegram"
echo ""
