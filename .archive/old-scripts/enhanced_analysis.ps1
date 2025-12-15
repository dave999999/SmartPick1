$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA"
    "Content-Type" = "application/json"
    "Prefer" = "count=exact"
}

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "              ENHANCED SUPABASE METRICS ANALYSIS" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ("="*80) + "`n" -ForegroundColor Cyan

# Get detailed table counts
Write-Host " DETAILED TABLE METRICS" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$tableMetrics = @{}
$tables = @{
    "offers" = "All product offers"
    "partners" = "Business partners"
    "reservations" = "Customer reservations"
    "user_points" = "User point balances"
    "point_transactions" = "Point transaction history"
    "achievements" = "Achievement definitions"
    "user_achievements" = "User achievement progress"
    "push_subscriptions" = "Push notification subscriptions"
    "announcements" = "System announcements"
}

foreach ($table in $tables.Keys) {
    try {
        $response = Invoke-WebRequest -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/$table`?select=id" -Headers $headers -Method GET
        $contentRange = $response.Headers.'Content-Range'
        if ($contentRange) {
            $count = ($contentRange -split '/')[1]
            $tableMetrics[$table] = $count
            Write-Host ("   {0,-25} {1,10} rows  ({2})" -f $table, $count, $tables[$table]) -ForegroundColor White
        }
    } catch {
        Write-Host "   $table`: Access restricted or table doesn't exist" -ForegroundColor DarkGray
    }
}

# Get status breakdown for key tables
Write-Host "`n OFFER STATUS BREAKDOWN" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$statuses = @("ACTIVE", "DRAFT", "EXPIRED", "SOLD_OUT")
foreach ($status in $statuses) {
    try {
        $response = Invoke-WebRequest -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/offers?select=id&status=eq.$status" -Headers $headers -Method GET
        $contentRange = $response.Headers.'Content-Range'
        if ($contentRange) {
            $count = ($contentRange -split '/')[1]
            $emoji = switch ($status) {
                "ACTIVE" { "" }
                "DRAFT" { "" }
                "EXPIRED" { "" }
                "SOLD_OUT" { "" }
            }
            Write-Host ("   {0} {1,-15} {2,5} offers" -f $emoji, $status, $count) -ForegroundColor White
        }
    } catch {
        # Status might not exist
    }
}

# Get reservation status
Write-Host "`n RESERVATION STATUS BREAKDOWN" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$resStatuses = @("ACTIVE", "PICKED_UP", "EXPIRED", "CANCELLED")
foreach ($status in $resStatuses) {
    try {
        $response = Invoke-WebRequest -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/reservations?select=id&status=eq.$status" -Headers $headers -Method GET
        $contentRange = $response.Headers.'Content-Range'
        if ($contentRange) {
            $count = ($contentRange -split '/')[1]
            $emoji = switch ($status) {
                "ACTIVE" { "" }
                "PICKED_UP" { "" }
                "EXPIRED" { "" }
                "CANCELLED" { "" }
            }
            Write-Host ("   {0} {1,-15} {2,5} reservations" -f $emoji, $status, $count) -ForegroundColor White
        }
    } catch {
        # Status might not exist
    }
}

# Partner status
Write-Host "`n PARTNER STATUS BREAKDOWN" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$partnerStatuses = @("ACTIVE", "PENDING", "SUSPENDED", "REJECTED")
foreach ($status in $partnerStatuses) {
    try {
        $response = Invoke-WebRequest -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/partners?select=id&status=eq.$status" -Headers $headers -Method GET
        $contentRange = $response.Headers.'Content-Range'
        if ($contentRange) {
            $count = ($contentRange -split '/')[1]
            $emoji = switch ($status) {
                "ACTIVE" { "" }
                "PENDING" { "" }
                "SUSPENDED" { "" }
                "REJECTED" { "" }
            }
            Write-Host ("   {0} {1,-15} {2,5} partners" -f $emoji, $status, $count) -ForegroundColor White
        }
    } catch {
        # Status might not exist
    }
}

# Connection pool health
Write-Host "`n CONNECTION POOL DETAILED ANALYSIS" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$poolStats = Invoke-RestMethod -Uri "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_connection_pool_stats" -Method POST -Headers $headers -Body "{}"

Write-Host "   Current State:" -ForegroundColor Cyan
Write-Host ("      Active:          {0,3} / {1} connections" -f $poolStats.active_connections, $poolStats.max_connections) -ForegroundColor White
Write-Host ("      Idle:            {0,3} connections" -f $poolStats.idle_connections) -ForegroundColor White
Write-Host ("      Running Queries: {0,3}" -f $poolStats.active_queries) -ForegroundColor White
Write-Host ("      Usage:           {0:N2}%" -f $poolStats.usage_percent) -ForegroundColor $(if($poolStats.usage_percent -lt 10){"Green"}elseif($poolStats.usage_percent -lt 50){"Yellow"}else{"Red"})

$capacity = $poolStats.max_connections - $poolStats.active_connections
Write-Host "`n   Capacity Analysis:" -ForegroundColor Cyan
Write-Host ("      Available:       {0} connections" -f $capacity) -ForegroundColor Green
Write-Host ("      Can handle:      ~{0} concurrent users" -f ($capacity * 5)) -ForegroundColor Green

# Calculate health score
Write-Host "`n DATABASE HEALTH SCORE" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$healthScore = 100
$issues = @()

if ($poolStats.usage_percent -gt 80) { 
    $healthScore -= 40
    $issues += "Critical connection pool usage"
}
elseif ($poolStats.usage_percent -gt 50) {
    $healthScore -= 20
    $issues += "Elevated connection pool usage"
}
elseif ($poolStats.usage_percent -gt 30) {
    $healthScore -= 10
}

# Check for data
if ($tableMetrics["offers"] -eq "0") {
    $healthScore -= 10
    $issues += "No active offers"
}

if ($tableMetrics["partners"] -eq "0") {
    $healthScore -= 10
    $issues += "No partners registered"
}

Write-Host ("   Overall Health Score: {0}/100" -f $healthScore) -NoNewline
if ($healthScore -ge 90) {
    Write-Host " [EXCELLENT ]" -ForegroundColor Green
} elseif ($healthScore -ge 70) {
    Write-Host " [GOOD ]" -ForegroundColor Green
} elseif ($healthScore -ge 50) {
    Write-Host " [FAIR ]" -ForegroundColor Yellow
} else {
    Write-Host " [POOR ]" -ForegroundColor Red
}

if ($issues.Count -gt 0) {
    Write-Host "`n   Issues Detected:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "       $issue" -ForegroundColor Red
    }
} else {
    Write-Host "`n    No critical issues detected" -ForegroundColor Green
}

# Performance projection
Write-Host "`n SCALABILITY PROJECTION" -ForegroundColor Yellow
Write-Host (""*80) -ForegroundColor Gray

$currentLoad = $poolStats.usage_percent
$maxSafeUsers = [math]::Floor((80 * $poolStats.max_connections) / (100 * ($poolStats.active_connections / 1)))

Write-Host "   Based on current metrics:" -ForegroundColor Cyan
Write-Host ("      Current Load:         {0:N2}%" -f $currentLoad) -ForegroundColor White
Write-Host ("      Estimated Safe Cap:   ~{0} concurrent connections" -f $maxSafeUsers) -ForegroundColor White
if ($currentLoad -lt 10) {
    Write-Host "      Growth Headroom:      Excellent (10x current load)" -ForegroundColor Green
} elseif ($currentLoad -lt 30) {
    Write-Host "      Growth Headroom:      Good (3x current load)" -ForegroundColor Green
} elseif ($currentLoad -lt 60) {
    Write-Host "      Growth Headroom:      Moderate (2x current load)" -ForegroundColor Yellow
} else {
    Write-Host "      Growth Headroom:      Limited (near capacity)" -ForegroundColor Red
}

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host ""
