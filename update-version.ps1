# Update App Version for Service Worker
# Run this script after deploying changes to trigger update notifications

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$indexPath = "index.html"

Write-Host "Updating app version..." -ForegroundColor Cyan

# Read the file
$content = Get-Content $indexPath -Raw

# Update the version
$newContent = $content -replace 'name="app-version" content="[^"]+"', "name=`"app-version`" content=`"$timestamp`""

# Write back
$newContent | Set-Content $indexPath -NoNewline

Write-Host "✅ Version updated to: $timestamp" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit: git add index.html && git commit -m 'chore: bump version to $timestamp'" 
Write-Host "2. Push: git push origin main"
Write-Host "3. Users will be notified of the update on their next visit"
Write-Host ""
