# Deploy Email Verification Edge Functions
# Run this script after setting up Supabase CLI

Write-Host "🚀 SmartPick Email Verification - Edge Functions Deployment" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if linked to project
$linkCheck = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Not linked to Supabase project" -ForegroundColor Yellow
    Write-Host "Linking to SmartPick project..." -ForegroundColor Cyan
    supabase link --project-ref ggzhtpaxnhwcilomswtm
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Linked to Supabase project" -ForegroundColor Green
Write-Host ""

# Deploy verify-email function
Write-Host "📧 Deploying verify-email Edge Function..." -ForegroundColor Cyan
supabase functions deploy verify-email

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ verify-email deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy verify-email" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy password-reset function
Write-Host "🔐 Deploying password-reset Edge Function..." -ForegroundColor Cyan
supabase functions deploy password-reset

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ password-reset deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy password-reset" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All Edge Functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Apply database migration in Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Update .env.local with Resend API key" -ForegroundColor White
Write-Host "3. Test signup flow with email verification" -ForegroundColor White
Write-Host ""
Write-Host "Edge Function URLs:" -ForegroundColor Cyan
Write-Host "  • Verify: https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/verify-email" -ForegroundColor White
Write-Host "  • Reset: https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/password-reset" -ForegroundColor White
Write-Host ""
