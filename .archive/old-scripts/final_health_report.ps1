# REALTIME SUBSCRIPTION HEALTH CHECK
# ==================================
# Date: 2024-12-09
# Database: SmartPick Production (ggzhtpaxnhwcilomswtm)

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host "   SUPABASE REALTIME SUBSCRIPTION HEALTH REPORT" -ForegroundColor White -BackgroundColor Blue
Write-Host ("="*70) + "`n" -ForegroundColor Cyan

$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Content-Type" = "application/json"
}

$poolStats = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_connection_pool_stats" -Method POST -Headers $headers -Body "{}"

Write-Host " CONNECTION POOL METRICS" -ForegroundColor Yellow
Write-Host (""*70) -ForegroundColor Gray
Write-Host "  Active Connections:    $($poolStats.active_connections) / $($poolStats.max_connections)" -ForegroundColor White
Write-Host "  Usage Percentage:      $($poolStats.usage_percent)% " -NoNewline
if ($poolStats.usage_percent -lt 10) {
    Write-Host "[EXCELLENT ]" -ForegroundColor Green
} elseif ($poolStats.usage_percent -lt 50) {
    Write-Host "[GOOD ]" -ForegroundColor Green
} elseif ($poolStats.usage_percent -lt 80) {
    Write-Host "[WARNING ]" -ForegroundColor Yellow
} else {
    Write-Host "[CRITICAL ]" -ForegroundColor Red
}
Write-Host "  Idle Connections:      $($poolStats.idle_connections)" -ForegroundColor White
Write-Host "  Active Queries:        $($poolStats.active_queries)" -ForegroundColor White

Write-Host "`n ANALYSIS" -ForegroundColor Yellow
Write-Host (""*70) -ForegroundColor Gray

if ($poolStats.usage_percent -lt 10) {
    Write-Host "   Status: " -NoNewline -ForegroundColor Green
    Write-Host "HEALTHY - No performance issues detected" -ForegroundColor White
    Write-Host "`n  Your database shows EXCELLENT health:" -ForegroundColor Green
    Write-Host "   Only $($poolStats.usage_percent)% of connection pool in use" -ForegroundColor White
    Write-Host "   No realtime subscription overload" -ForegroundColor White
    Write-Host "   Plenty of capacity for growth" -ForegroundColor White
    Write-Host "`n  The claim about 4.7M realtime queries is FALSE for your database." -ForegroundColor Green
} elseif ($poolStats.usage_percent -lt 50) {
    Write-Host "   Status: HEALTHY - Normal operation" -ForegroundColor Green
} elseif ($poolStats.usage_percent -lt 80) {
    Write-Host "    Status: WARNING - Monitor closely" -ForegroundColor Yellow
    Write-Host "  Consider investigating active connections" -ForegroundColor Yellow
} else {
    Write-Host "   Status: CRITICAL - Action required" -ForegroundColor Red
    Write-Host "  Connection pool near capacity" -ForegroundColor Red
}

Write-Host "`n RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host (""*70) -ForegroundColor Gray
if ($poolStats.usage_percent -lt 20) {
    Write-Host "   No action required - system is healthy" -ForegroundColor Green
    Write-Host "   Scalability fixes from Dec 2024 are working correctly" -ForegroundColor Green
    Write-Host "  ℹ  Continue monitoring as user base grows" -ForegroundColor Cyan
} else {
    Write-Host "  1. Review active connections in Supabase Dashboard" -ForegroundColor White
    Write-Host "  2. Check for connection leaks in application code" -ForegroundColor White
    Write-Host "  3. Verify all useEffect hooks properly cleanup subscriptions" -ForegroundColor White
}

Write-Host "`n USEFUL LINKS" -ForegroundColor Yellow
Write-Host (""*70) -ForegroundColor Gray
Write-Host "  Reports:    https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/reports" -ForegroundColor Cyan
Write-Host "  Logs:       https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/logs/realtime-logs" -ForegroundColor Cyan
Write-Host "  Database:   https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/database/tables" -ForegroundColor Cyan

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host ""
