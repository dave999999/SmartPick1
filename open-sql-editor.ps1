Write-Host "🚀 Opening Supabase SQL Editor..." -ForegroundColor Cyan
Write-Host ""

# Copy SQL to clipboard
$sql = Get-Content "RECREATE_ANNOUNCEMENTS_TABLE.sql" -Raw
Set-Clipboard -Value $sql

Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. SQL Editor will open in your browser"
Write-Host "2. Paste the SQL (Ctrl+V) - it's already in your clipboard!"
Write-Host "3. Click 'RUN' button"
Write-Host "4. You should see: Announcements table created and schema refreshed"
Write-Host ""

Start-Process "https://supabase.com/dashboard/project/ggzhipaxnhwcilomswtn/sql/new"

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
