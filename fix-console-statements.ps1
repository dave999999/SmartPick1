# Automated Console Statement Replacement Script
# Replaces all console.* statements with logger.* equivalents

$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Check if logger is already imported
    $hasLoggerImport = $content -match "import.*logger.*from.*@/lib/logger"
    
    # Check if file has console statements
    $hasConsole = $content -match "console\.(log|warn|error|debug|info)"
    
    if ($hasConsole) {
        Write-Host "Processing: $($file.FullName)" -ForegroundColor Cyan
        
        # Replace console statements
        $content = $content -replace "console\.log\(", "logger.debug("
        $content = $content -replace "console\.debug\(", "logger.debug("
        $content = $content -replace "console\.info\(", "logger.info("
        $content = $content -replace "console\.warn\(", "logger.warn("
        $content = $content -replace "console\.error\(", "logger.error("
        
        # Add logger import if not present
        if (-not $hasLoggerImport) {
            # Find the last import statement
            if ($content -match "(?s)(import.*?;)(?=\s*\n\s*(?:export|interface|type|const|function|class|/\*\*|\n))") {
                $lastImport = $matches[1]
                $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { logger } from '@/lib/logger';"
            } else {
                # No imports found, add at the beginning
                $content = "import { logger } from '@/lib/logger';`n`n" + $content
            }
        }
        
        # Save the file
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Fixed $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Console statement replacement complete!" -ForegroundColor Green
Write-Host "`nVerifying changes..." -ForegroundColor Yellow
$remaining = (Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.(log|warn|error|debug)" | Measure-Object).Count
$color = if ($remaining -eq 0) { "Green" } else { "Yellow" }
Write-Host "Remaining console statements: $remaining" -ForegroundColor $color
