#!/usr/bin/env pwsh
# Deploy Email Edge Functions to Supabase
# Run this after configuring secrets

$ErrorActionPreference = "Stop"

Write-Host "🚀 SmartPick Email Edge Functions Deployment" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase`n" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host "Checking login status..." -ForegroundColor Yellow
try {
    supabase projects list | Out-Null
    Write-Host "✅ Logged in to Supabase`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Supabase!" -ForegroundColor Red
    Write-Host "Login with: supabase login`n" -ForegroundColor Yellow
    exit 1
}

# Check if linked to project
Write-Host "Checking project link..." -ForegroundColor Yellow
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

Write-Host "✅ Linked to Supabase project`n" -ForegroundColor Green
# Prompt for secrets
Write-Host "📋 Configuration Check" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

$configureSecrets = Read-Host "Have you configured the Edge Function secrets? (RESEND_API_KEY, PUBLIC_BASE_URL) [y/N]"
if ($configureSecrets -ne "y") {
    Write-Host "`n⚠️  Please configure secrets first:" -ForegroundColor Yellow
    Write-Host "   supabase secrets set RESEND_API_KEY=re_YOUR_NEW_API_KEY" -ForegroundColor Gray
    Write-Host "   supabase secrets set PUBLIC_BASE_URL=https://www.smartpick.ge`n" -ForegroundColor Gray
    
    $doItNow = Read-Host "Do you want to set them now? [y/N]"
    if ($doItNow -eq "y") {
        Write-Host "`nEnter RESEND_API_KEY (starts with re_):" -ForegroundColor Yellow
        $resendKey = Read-Host
        
        Write-Host "Enter PUBLIC_BASE_URL (default: https://www.smartpick.ge):" -ForegroundColor Yellow
        $baseUrl = Read-Host
        if ([string]::IsNullOrWhiteSpace($baseUrl)) {
            $baseUrl = "https://www.smartpick.ge"
        }
        
        Write-Host "`nSetting secrets..." -ForegroundColor Yellow
        supabase secrets set "RESEND_API_KEY=$resendKey"
        supabase secrets set "PUBLIC_BASE_URL=$baseUrl"
        Write-Host "✅ Secrets configured`n" -ForegroundColor Green
    } else {
        Write-Host "Exiting...`n" -ForegroundColor Red
        exit 0
    }
}

# Deploy Edge Functions
Write-Host "`n🚀 Deploying Edge Functions" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

$functions = @(
    "send-verification-email",
    "send-password-reset-email",
    "verify-email"
)

$deployed = @()
$failed = @()

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    try {
        supabase functions deploy $func --no-verify-jwt
        if ($LASTEXITCODE -eq 0) {
            $deployed += $func
            Write-Host "✅ $func deployed successfully" -ForegroundColor Green
        } else {
            $failed += $func
            Write-Host "❌ $func deployment failed" -ForegroundColor Red
        }
    } catch {
        $failed += $func
        Write-Host "❌ $func deployment failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Summary
Write-Host "`n📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "===================`n" -ForegroundColor Cyan

if ($deployed.Count -gt 0) {
    Write-Host "✅ Successfully deployed ($($deployed.Count)):" -ForegroundColor Green
    foreach ($func in $deployed) {
        Write-Host "   - $func" -ForegroundColor Gray
    }
    Write-Host ""
}

if ($failed.Count -gt 0) {
    Write-Host "❌ Failed to deploy ($($failed.Count)):" -ForegroundColor Red
    foreach ($func in $failed) {
        Write-Host "   - $func" -ForegroundColor Gray
    }
    Write-Host ""
}

# Verify deployment
if ($deployed.Count -eq $functions.Count) {
    Write-Host "🎉 All Edge Functions deployed successfully!`n" -ForegroundColor Green
    
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test signup flow at https://www.smartpick.ge" -ForegroundColor Gray
    Write-Host "2. Test password reset flow" -ForegroundColor Gray
    Write-Host "3. Check Resend dashboard for email delivery" -ForegroundColor Gray
    Write-Host "4. Monitor logs: supabase functions logs send-verification-email --tail`n" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Some deployments failed. Please check the errors above.`n" -ForegroundColor Yellow
    exit 1
}

# Offer to view logs
$viewLogs = Read-Host "Do you want to view real-time logs for send-verification-email? [y/N]"
if ($viewLogs -eq "y") {
    Write-Host "`nStarting log stream (Ctrl+C to exit)...`n" -ForegroundColor Yellow
    supabase functions logs send-verification-email --tail
}
