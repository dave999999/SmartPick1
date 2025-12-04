#!/usr/bin/env pwsh
# =====================================================
# Test Script: Scalability Improvements
# =====================================================
# Purpose: Verify all scalability fixes are working
# Created: 2024-12-04
# =====================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        Scalability Improvements Test Suite                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# ===============================================
# Test 1: Rate Limiting Migration Applied
# ===============================================
Write-Host "🧪 Test 1: Rate Limiting Migration" -ForegroundColor Yellow
Write-Host "   Checking if api_rate_limits table exists..." -NoNewline

# This test requires Supabase connection - placeholder for actual test
Write-Host " SKIPPED (requires DB connection)" -ForegroundColor Gray
Write-Host "   Manual check: Run this SQL in Supabase:"
Write-Host "   SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_rate_limits');" -ForegroundColor DarkGray
Write-Host ""

# ===============================================
# Test 2: IndexedDB Cache TTL
# ===============================================
Write-Host "🧪 Test 2: IndexedDB Cache TTL Implementation" -ForegroundColor Yellow
Write-Host "   Checking if CachedData interface exists..." -NoNewline

if (Select-String -Path "src/lib/indexedDB.ts" -Pattern "export interface CachedData" -Quiet) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}

Write-Host "   Checking if cacheOffers accepts TTL parameter..." -NoNewline
if (Select-String -Path "src/lib/indexedDB.ts" -Pattern "ttl: number = 5 \* 60 \* 1000" -Quiet) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}

Write-Host "   Checking if getCachedOffers validates TTL..." -NoNewline
if (Select-String -Path "src/lib/indexedDB.ts" -Pattern "age > cached.ttl" -Quiet) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# ===============================================
# Test 3: Realtime Subscription Removal
# ===============================================
Write-Host "🧪 Test 3: Realtime Polling Implementation" -ForegroundColor Yellow

Write-Host "   Checking SmartPointsWallet uses polling..." -NoNewline
if ((Select-String -Path "src/components/SmartPointsWallet.tsx" -Pattern "setInterval" -Quiet) -and 
    !(Select-String -Path "src/components/SmartPointsWallet.tsx" -Pattern "subscribeToUserPoints" -Quiet)) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}

Write-Host "   Checking AchievementsGrid uses polling..." -NoNewline
if ((Select-String -Path "src/components/gamification/AchievementsGrid.tsx" -Pattern "setInterval" -Quiet) -and 
    !(Select-String -Path "src/components/gamification/AchievementsGrid.tsx" -Pattern "channelRef.current" -Quiet)) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# ===============================================
# Test 4: Realtime Event Rate Reduced
# ===============================================
Write-Host "🧪 Test 4: Realtime Configuration" -ForegroundColor Yellow
Write-Host "   Checking eventsPerSecond reduced to 2..." -NoNewline
if (Select-String -Path "src/lib/supabase.ts" -Pattern "eventsPerSecond: 2" -Quiet) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL (should be 2, not 10)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# ===============================================
# Test 5: Connection Pool Monitoring
# ===============================================
Write-Host "🧪 Test 5: Connection Pool Monitoring" -ForegroundColor Yellow
Write-Host "   Checking if checkConnectionPool exists..." -NoNewline
if (Select-String -Path "src/lib/monitoring/performance.ts" -Pattern "async checkConnectionPool" -Quiet) {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}

Write-Host "   Checking if SQL function migration exists..." -NoNewline
if (Test-Path "supabase/migrations/20241204_connection_pool_monitoring.sql") {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# ===============================================
# Test 6: Migration Files Created
# ===============================================
Write-Host "🧪 Test 6: Migration Files" -ForegroundColor Yellow
Write-Host "   Checking if rate_limiting migration exists..." -NoNewline
if (Test-Path "supabase/migrations/20241204_rate_limiting.sql") {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}

Write-Host "   Checking if Phase 1 migration exists..." -NoNewline
if (Test-Path "supabase/migrations/20241204_scalability_phase1.sql") {
    Write-Host " ✅ PASS" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# ===============================================
# Test 7: Build Test
# ===============================================
Write-Host "🧪 Test 7: TypeScript Compilation" -ForegroundColor Yellow
Write-Host "   Running TypeScript type check..." -NoNewline

try {
    $output = pnpm tsc --noEmit 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ PASS (no type errors)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ❌ FAIL (type errors found)" -ForegroundColor Red
        Write-Host $output -ForegroundColor DarkRed
        $testsFailed++
    }
} catch {
    Write-Host " ⚠️  SKIPPED (tsc not available)" -ForegroundColor Yellow
}
Write-Host ""

# ===============================================
# Summary
# ===============================================
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Test Summary                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "  ❌ Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 All tests passed! Ready to apply migrations." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Apply rate limiting migration in Supabase SQL Editor"
    Write-Host "  2. Apply connection pool monitoring migration"
    Write-Host "  3. Test in browser (check IndexedDB cache, polling intervals)"
    Write-Host "  4. Monitor Performance tab in admin dashboard"
    exit 0
} else {
    Write-Host "⚠️  Some tests failed. Please review errors above." -ForegroundColor Yellow
    exit 1
}
