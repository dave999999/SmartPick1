$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Content-Type" = "application/json"
}

Write-Host "`n=== CONNECTION POOL HEALTH ===" -ForegroundColor Green -BackgroundColor Black
try {
    $poolStats = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_connection_pool_stats" -Method POST -Headers $headers -Body "{}"
    
    Write-Host "`nConnection Pool Status:" -ForegroundColor Cyan
    Write-Host "  Active Connections:  $($poolStats.active_connections)" -ForegroundColor White
    Write-Host "  Max Connections:     $($poolStats.max_connections)" -ForegroundColor White
    Write-Host "  Usage:               $($poolStats.usage_percent)%" -ForegroundColor $(if($poolStats.usage_percent -gt 80){"Red"}elseif($poolStats.usage_percent -gt 60){"Yellow"}else{"Green"})
    Write-Host "  Idle Connections:    $($poolStats.idle_connections)" -ForegroundColor White
    Write-Host "  Active Queries:      $($poolStats.active_queries)" -ForegroundColor White
    
    if ($poolStats.usage_percent -lt 20) {
        Write-Host "`n EXCELLENT - Connection pool usage is very low ($($poolStats.usage_percent)%)" -ForegroundColor Green
        Write-Host "   No realtime subscription overload detected!" -ForegroundColor Green
    } elseif ($poolStats.usage_percent -lt 50) {
        Write-Host "`n GOOD - Connection pool usage is healthy ($($poolStats.usage_percent)%)" -ForegroundColor Green
    } elseif ($poolStats.usage_percent -lt 80) {
        Write-Host "`n  WARNING - Connection pool usage is elevated ($($poolStats.usage_percent)%)" -ForegroundColor Yellow
    } else {
        Write-Host "`n CRITICAL - Connection pool usage is high ($($poolStats.usage_percent)%)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error checking connection pool: $_" -ForegroundColor Red
}

Write-Host "`n=== REALTIME DIAGNOSTICS ===" -ForegroundColor Green -BackgroundColor Black
Write-Host "`nTo check if realtime.list_changes is consuming CPU:" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/reports" -ForegroundColor White
Write-Host "2. Check 'Database' tab for query performance" -ForegroundColor White
Write-Host "3. Look for 'realtime.list_changes' in top queries" -ForegroundColor White
Write-Host "`n4. Check Realtime connections:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/logs/realtime-logs" -ForegroundColor White

Write-Host "`n=== SUMMARY ===" -ForegroundColor Green -BackgroundColor Black
Write-Host "Based on connection pool stats:" -ForegroundColor Cyan
if ($poolStats.usage_percent -lt 20) {
    Write-Host " Your database is NOT experiencing realtime subscription overload" -ForegroundColor Green
    Write-Host " Only $($poolStats.active_connections) active connections (limit: $($poolStats.max_connections))" -ForegroundColor Green
    Write-Host "`nThe scalability fixes from December 2024 are working!" -ForegroundColor Green
} else {
    Write-Host "  Connection usage is higher than expected" -ForegroundColor Yellow
    Write-Host "Consider investigating active connections" -ForegroundColor Yellow
}
Write-Host ""
