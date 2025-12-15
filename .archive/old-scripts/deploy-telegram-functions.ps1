# Deploy both Telegram Edge Functions to Supabase

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Deploying Telegram Edge Functions" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Deploy telegram-webhook
Write-Host ""
Write-Host "1. Deploying telegram-webhook..." -ForegroundColor Yellow
supabase functions deploy telegram-webhook --no-verify-jwt

# Deploy send-notification
Write-Host ""
Write-Host "2. Deploying send-notification..." -ForegroundColor Yellow
supabase functions deploy send-notification

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify functions in Supabase Dashboard > Edge Functions"
Write-Host "2. Test Telegram webhook"
Write-Host "3. Connect Telegram in app: Profile > Settings > Telegram"
Write-Host ""
