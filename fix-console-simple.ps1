# Simple Console Statement Replacement Script
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "console\.(log|warn|error|debug|info)") {
        Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
        
        # Check if logger is already imported
        $hasLogger = $content -match "import.*logger.*from"
        
        # Replace console statements
        $content = $content -replace "console\.log\(", "logger.debug("
        $content = $content -replace "console\.debug\(", "logger.debug("
        $content = $content -replace "console\.info\(", "logger.info("
        $content = $content -replace "console\.warn\(", "logger.warn("
        $content = $content -replace "console\.error\(", "logger.error("
        
        # Add logger import if needed
        if (-not $hasLogger) {
            $content = "import { logger } from '@/lib/logger';`n" + $content
        }
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nDone! Counting remaining console statements..." -ForegroundColor Yellow
$remaining = (Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.(log|warn|error|debug)" | Measure-Object).Count
Write-Host "Remaining: $remaining" -ForegroundColor Green
