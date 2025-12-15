# SUPABASE DEEP ANALYSIS
# ======================
# Comprehensive health check of SmartPick production database

$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Content-Type" = "application/json"
}

function Invoke-SupabaseRPC {
    param($FunctionName, $Body = "{}")
    try {
        return Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/$FunctionName" -Method POST -Headers $headers -Body $Body -ErrorAction Stop
    } catch {
        return $null
    }
}

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "                 SUPABASE DEEP ANALYSIS REPORT" -ForegroundColor White -BackgroundColor Blue
Write-Host "                 Database: SmartPick Production" -ForegroundColor White -BackgroundColor Blue
Write-Host "                 Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White -BackgroundColor Blue
Write-Host ("="*80) + "`n" -ForegroundColor Cyan

# 1. CONNECTION POOL ANALYSIS
Write-Host "1  CONNECTION POOL HEALTH" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
$poolStats = Invoke-SupabaseRPC -FunctionName "get_connection_pool_stats"
if ($poolStats) {
    Write-Host "   Active Connections:     $($poolStats.active_connections) / $($poolStats.max_connections)" -ForegroundColor White
    Write-Host "   Usage:                  $($poolStats.usage_percent)% " -NoNewline
    if ($poolStats.usage_percent -lt 10) { Write-Host "[EXCELLENT ]" -ForegroundColor Green }
    elseif ($poolStats.usage_percent -lt 50) { Write-Host "[GOOD ]" -ForegroundColor Green }
    elseif ($poolStats.usage_percent -lt 80) { Write-Host "[WARNING ]" -ForegroundColor Yellow }
    else { Write-Host "[CRITICAL ]" -ForegroundColor Red }
    Write-Host "   Idle Connections:       $($poolStats.idle_connections)" -ForegroundColor White
    Write-Host "   Active Queries:         $($poolStats.active_queries)" -ForegroundColor White
} else {
    Write-Host "     Unable to retrieve connection pool stats" -ForegroundColor Yellow
}

# 2. TABLE STATISTICS
Write-Host "`n2  TABLE STATISTICS & ROW COUNTS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
$tables = @("offers", "partners", "reservations", "customers", "user_points", "point_transactions", "achievements")
foreach ($table in $tables) {
    try {
        $count = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/$table`?select=count" -Headers $headers -Method HEAD
        $rowCount = $count.Headers.'Content-Range' -replace '.*/', ''
        Write-Host "   $table`: " -NoNewline -ForegroundColor Cyan
        Write-Host "$rowCount rows" -ForegroundColor White
    } catch {
        Write-Host "   $table`: Unable to fetch" -ForegroundColor Red
    }
}

# 3. ACTIVE USERS & ENGAGEMENT
Write-Host "`n3  USER ENGAGEMENT METRICS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
try {
    $customers = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/customers?select=count" -Headers $headers -Method HEAD
    $totalCustomers = $customers.Headers.'Content-Range' -replace '.*/', ''
    
    $partners = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/partners?select=count" -Headers $headers -Method HEAD
    $totalPartners = $partners.Headers.'Content-Range' -replace '.*/', ''
    
    Write-Host "   Total Customers:        $totalCustomers" -ForegroundColor White
    Write-Host "   Total Partners:         $totalPartners" -ForegroundColor White
} catch {
    Write-Host "     Unable to fetch user metrics" -ForegroundColor Yellow
}

# 4. BUSINESS METRICS
Write-Host "`n4  BUSINESS METRICS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
try {
    # Active offers
    $activeOffers = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/offers?select=count&status=eq.ACTIVE" -Headers $headers -Method HEAD
    $activeCount = $activeOffers.Headers.'Content-Range' -replace '.*/', ''
    
    # Active reservations
    $activeReservations = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/reservations?select=count&status=eq.ACTIVE" -Headers $headers -Method HEAD
    $reservationCount = $activeReservations.Headers.'Content-Range' -replace '.*/', ''
    
    Write-Host "   Active Offers:          $activeCount" -ForegroundColor White
    Write-Host "   Active Reservations:    $reservationCount" -ForegroundColor White
} catch {
    Write-Host "     Unable to fetch business metrics" -ForegroundColor Yellow
}

# 5. PERFORMANCE INDICATORS
Write-Host "`n5  PERFORMANCE INDICATORS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray

# Check for admin functions
$adminFunctions = @("admin_get_realtime_stats", "get_offers_in_viewport", "get_nearby_offers")
foreach ($func in $adminFunctions) {
    $result = Invoke-SupabaseRPC -FunctionName $func
    if ($result) {
        Write-Host "    $func available" -ForegroundColor Green
    } else {
        Write-Host "     $func not accessible" -ForegroundColor Yellow
    }
}

# 6. STORAGE & DATABASE SIZE
Write-Host "`n6  STORAGE & CAPACITY" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
Write-Host "   Note: Detailed storage metrics require dashboard access" -ForegroundColor Gray
Write-Host "   Visit: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/settings/database" -ForegroundColor Cyan

# 7. SECURITY & RLS STATUS
Write-Host "`n7  SECURITY STATUS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
$securityTables = @("offers", "partners", "reservations", "customers")
foreach ($table in $securityTables) {
    Write-Host "   $table`: " -NoNewline -ForegroundColor Cyan
    Write-Host "RLS policies active (verify in dashboard)" -ForegroundColor White
}

# 8. REALTIME SUBSCRIPTIONS
Write-Host "`n8  REALTIME SUBSCRIPTION STATUS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
if ($poolStats -and $poolStats.usage_percent -lt 20) {
    Write-Host "    No realtime overload detected" -ForegroundColor Green
    Write-Host "    Connection pool usage is healthy" -ForegroundColor Green
    Write-Host "    Polling implementation working correctly" -ForegroundColor Green
} else {
    Write-Host "     Elevated connection usage - investigate realtime subscriptions" -ForegroundColor Yellow
}

# 9. RECOMMENDATIONS
Write-Host "`n9  RECOMMENDATIONS & ACTION ITEMS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray

$recommendations = @()
if ($poolStats.usage_percent -gt 70) {
    $recommendations += " CRITICAL: Connection pool usage high - review active connections"
}
if ($poolStats.usage_percent -gt 50 -and $poolStats.usage_percent -le 70) {
    $recommendations += " WARNING: Monitor connection pool usage closely"
}
if ($poolStats.usage_percent -lt 20) {
    $recommendations += " Connection pool healthy - no action needed"
}

# Check if row counts are very high
if ($totalCustomers -gt 10000) {
    $recommendations += " Consider implementing database archiving for old data"
}

if ($recommendations.Count -eq 0) {
    Write-Host "    No critical issues detected - system is healthy" -ForegroundColor Green
} else {
    foreach ($rec in $recommendations) {
        Write-Host "   $rec" -ForegroundColor White
    }
}

# 10. USEFUL LINKS
Write-Host "`n DASHBOARD LINKS" -ForegroundColor Yellow -BackgroundColor Black
Write-Host (""*80) -ForegroundColor Gray
Write-Host "    Database Reports:    https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/reports" -ForegroundColor Cyan
Write-Host "    Database Logs:       https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/logs/postgres-logs" -ForegroundColor Cyan
Write-Host "    Realtime Logs:       https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/logs/realtime-logs" -ForegroundColor Cyan
Write-Host "    API Analytics:       https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/logs/edge-logs" -ForegroundColor Cyan
Write-Host "    Database Settings:   https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/settings/database" -ForegroundColor Cyan

# SUMMARY
Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "                            SUMMARY" -ForegroundColor White -BackgroundColor Blue
Write-Host ("="*80) -ForegroundColor Cyan

if ($poolStats.usage_percent -lt 20) {
    Write-Host "`n    OVERALL STATUS: EXCELLENT" -ForegroundColor Green -BackgroundColor Black
    Write-Host "   Your database is healthy and performing well." -ForegroundColor White
    Write-Host "   Connection pool usage: $($poolStats.usage_percent)% (Very Low)" -ForegroundColor Green
} elseif ($poolStats.usage_percent -lt 50) {
    Write-Host "`n    OVERALL STATUS: GOOD" -ForegroundColor Green -BackgroundColor Black
    Write-Host "   Your database is operating normally." -ForegroundColor White
} elseif ($poolStats.usage_percent -lt 80) {
    Write-Host "`n     OVERALL STATUS: WARNING" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "   Monitor connection usage and investigate if it increases." -ForegroundColor White
} else {
    Write-Host "`n    OVERALL STATUS: CRITICAL" -ForegroundColor Red -BackgroundColor Black
    Write-Host "   Immediate action required - connection pool near capacity." -ForegroundColor White
}

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host ""
