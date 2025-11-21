# Execute SQL via Supabase Management API
$projectRef = "ggzhipaxnhwcilomswtn"
$supabaseToken = $env:SUPABASE_ACCESS_TOKEN

if (-not $supabaseToken) {
    Write-Host "❌ SUPABASE_ACCESS_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please copy the SQL from RECREATE_ANNOUNCEMENTS_TABLE.sql" -ForegroundColor Yellow
    Write-Host "and run it manually in Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
    exit 1
}

$sqlContent = Get-Content "RECREATE_ANNOUNCEMENTS_TABLE.sql" -Raw

$headers = @{
    "Authorization" = "Bearer $supabaseToken"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

Write-Host "🚀 Executing SQL on Supabase..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method Post -Headers $headers -Body $body
    Write-Host "✅ SQL executed successfully!" -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "❌ Error executing SQL:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Please run the SQL manually in Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
}
