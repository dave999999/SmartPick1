# Check and Set Telegram Webhook

# 1. Check current webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# 2. If webhook is not set or wrong, set it:
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/telegram-webhook",
    "allowed_updates": ["message", "callback_query"]
  }'

# Expected response:
# {"ok":true,"result":true,"description":"Webhook was set"}

# 3. Test by sending a message to your bot
# Then check: curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# For Windows PowerShell, use:
# Invoke-RestMethod -Uri "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo" -Method Get | ConvertTo-Json
