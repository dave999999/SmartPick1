@echo off
echo ========================================
echo Deploying Telegram Bot Webhook Function
echo ========================================
echo.

echo Deploying function to Supabase...
call supabase functions deploy telegram-webhook --no-verify-jwt

echo.
echo ========================================
echo IMPORTANT: Set up the webhook URL
echo ========================================
echo.
echo Run this command to set the webhook:
echo.
echo curl -X POST "https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook" ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"url\": \"https://[YOUR_PROJECT_REF].supabase.co/functions/v1/telegram-webhook\"}"
echo.
echo Replace:
echo   [YOUR_BOT_TOKEN] with your actual bot token
echo   [YOUR_PROJECT_REF] with your Supabase project reference
echo.
echo ========================================
echo Deployment complete!
echo ========================================
pause
