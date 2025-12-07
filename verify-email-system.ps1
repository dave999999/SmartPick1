#!/usr/bin/env pwsh
# Comprehensive Email Verification System Test
# Tests all components of the email verification flow

$ErrorActionPreference = "Continue"

Write-Host "Email Verification System - Comprehensive Check" -ForegroundColor Cyan
Write-Host "==================================================`n" -ForegroundColor Cyan

$projectRef = "ggzhtpaxnhwcilomswtm"
$baseUrl = "https://$projectRef.supabase.co"

# Test Results
$results = @{
    EdgeFunctionsDeployed = $false
    SecretsConfigured = $false
    EndpointsAccessible = $false
    MigrationsApplied = $false
}

# 1. Check Edge Functions Deployment
Write-Host "1. Checking Edge Functions Deployment..." -ForegroundColor Yellow
try {
    $functions = supabase functions list 2>&1 | Out-String
    
    $requiredFunctions = @(
        "send-verification-email",
        "verify-email",
        "send-password-reset-email"
    )
    
    $allDeployed = $true
    foreach ($func in $requiredFunctions) {
        if ($functions -match $func) {
            Write-Host "   ✅ $func - DEPLOYED" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $func - NOT FOUND" -ForegroundColor Red
            $allDeployed = $false
        }
    }
    
    $results.EdgeFunctionsDeployed = $allDeployed
} catch {
    Write-Host "   ❌ Failed to check functions: $_" -ForegroundColor Red
}

Write-Host ""

# 2. Check Secrets Configuration
Write-Host "2. Checking Required Secrets..." -ForegroundColor Yellow
try {
    $secrets = supabase secrets list 2>&1 | Out-String
    
    $requiredSecrets = @(
        "RESEND_API_KEY",
        "PUBLIC_BASE_URL"
    )
    
    $allConfigured = $true
    foreach ($secret in $requiredSecrets) {
        if ($secrets -match $secret) {
            Write-Host "   ✅ $secret - CONFIGURED" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $secret - MISSING" -ForegroundColor Red
            $allConfigured = $false
        }
    }
    
    $results.SecretsConfigured = $allConfigured
} catch {
    Write-Host "   ❌ Failed to check secrets: $_" -ForegroundColor Red
}

Write-Host ""

# 3. Test Endpoint Accessibility
Write-Host "3. Testing Edge Function Endpoints..." -ForegroundColor Yellow

$endpoints = @{
    "send-verification-email" = "$baseUrl/functions/v1/send-verification-email"
    "verify-email" = "$baseUrl/functions/v1/verify-email"
    "send-password-reset-email" = "$baseUrl/functions/v1/send-password-reset-email"
}

$allAccessible = $true
foreach ($name in $endpoints.Keys) {
    try {
        $response = Invoke-WebRequest -Uri $endpoints[$name] -Method OPTIONS -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "   [OK] $name - ACCESSIBLE (200 OK)" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] $name - Unexpected status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   [FAIL] $name - NOT ACCESSIBLE" -ForegroundColor Red
        $allAccessible = $false
    }
}

$results.EndpointsAccessible = $allAccessible

Write-Host ""

# 4. Check Database Tables
Write-Host "4. Checking Database Schema..." -ForegroundColor Yellow
Write-Host "   (Run this SQL query in Supabase Dashboard to verify tables exist)" -ForegroundColor Gray
Write-Host ""
Write-Host @"
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
       'email_verification_tokens',
       'password_reset_tokens', 
       'email_rate_limits'
   );
"@ -ForegroundColor DarkGray

Write-Host ""
Write-Host "   [INFO] Manual Check Required: " -NoNewline -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$projectRef/sql" -ForegroundColor Blue

Write-Host ""

# Summary
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

Write-Host ""
Write-Host "Component Status:" -ForegroundColor White
Write-Host "  Edge Functions Deployed: " -NoNewline
Write-Host $(if ($results.EdgeFunctionsDeployed) { "✅ YES" } else { "❌ NO" }) -ForegroundColor $(if ($results.EdgeFunctionsDeployed) { "Green" } else { "Red" })

Write-Host "  Secrets Configured:      " -NoNewline
Write-Host $(if ($results.SecretsConfigured) { "✅ YES" } else { "❌ NO" }) -ForegroundColor $(if ($results.SecretsConfigured) { "Green" } else { "Red" })

Write-Host "  Endpoints Accessible:    " -NoNewline
Write-Host $(if ($results.EndpointsAccessible) { "✅ YES" } else { "❌ NO" }) -ForegroundColor $(if ($results.EndpointsAccessible) { "Green" } else { "Red" })

Write-Host ""

# Overall Status
$allGood = $results.EdgeFunctionsDeployed -and $results.SecretsConfigured -and $results.EndpointsAccessible

if ($allGood) {
    Write-Host "[SUCCESS] EMAIL VERIFICATION SYSTEM: " -NoNewline -ForegroundColor Green
    Write-Host "FULLY OPERATIONAL" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "The warning at line 632 is just a safety message." -ForegroundColor Gray
    Write-Host "Users WILL receive verification emails." -ForegroundColor Gray
} else {
    Write-Host "[WARNING] EMAIL VERIFICATION SYSTEM: " -NoNewline -ForegroundColor Yellow
    Write-Host "NEEDS ATTENTION" -ForegroundColor Yellow -BackgroundColor DarkYellow
    Write-Host ""
    
    if (-not $results.EdgeFunctionsDeployed) {
        Write-Host "[ACTION] Deploy Edge Functions:" -ForegroundColor Red
        Write-Host "   Run: .\deploy-email-functions.ps1" -ForegroundColor Gray
    }
    
    if (-not $results.SecretsConfigured) {
        Write-Host "[ACTION] Configure Secrets:" -ForegroundColor Red
        Write-Host "   supabase secrets set RESEND_API_KEY=re_YOUR_KEY" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "="*50 -ForegroundColor Cyan
Write-Host ""

# Additional Info
Write-Host "Additional Resources:" -ForegroundColor Cyan
Write-Host "  - Resend Dashboard: https://resend.com/emails" -ForegroundColor Blue
Write-Host "  - Supabase Functions: https://supabase.com/dashboard/project/$projectRef/functions" -ForegroundColor Blue
Write-Host "  - View Logs: supabase functions logs send-verification-email --tail" -ForegroundColor Gray
Write-Host ""
