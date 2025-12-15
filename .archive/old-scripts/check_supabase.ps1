# Simple query to check connection pool
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Content-Type" = "application/json"
}

try {
    Write-Host "`n=== Checking Connection Pool Stats ===" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_connection_pool_stats" -Method POST -Headers $headers -Body "{}"
    $response | Format-Table -AutoSize
    Write-Host ""
} catch {
    Write-Host "Connection pool stats function not available or error: $_" -ForegroundColor Yellow
}

Write-Host "=== Checking Realtime Channels in Supabase Dashboard ===" -ForegroundColor Cyan
Write-Host "Please manually check: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm" -ForegroundColor White
Write-Host "Navigate to: Database -> Replication -> Realtime" -ForegroundColor White
