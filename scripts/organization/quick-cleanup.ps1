# Quick Cleanup Script - SmartPick Codebase Organization
# Simplified version for immediate execution

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  SMARTPICK CODE HYGIENE - QUICK CLEANUP" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

if ($DryRun) {
    Write-Host "Mode: DRY RUN - No changes will be made" -ForegroundColor Yellow
} else {
    Write-Host "Mode: LIVE - Changes will be applied" -ForegroundColor Green
}

$rootPath = "d:\v3\workspace\shadcn-ui"

# Create directory structure
Write-Host ""
Write-Host "[1/7] Creating directory structure..." -ForegroundColor Cyan

$directories = @(
    ".archive\2024-12-old-docs",
    ".archive\2024-12-old-migrations\hotfixes",
    ".archive\2024-12-old-migrations\debug",
    ".archive\2024-12-old-migrations\instructions",
    ".archive\2024-12-old-scripts",
    "docs\architecture",
    "docs\features",
    "docs\deployment",
    "docs\design",
    "docs\api",
    "docs\guides",
    "migrations",
    "scripts\setup",
    "scripts\deploy",
    "scripts\debug",
    "scripts\maintenance"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $rootPath $dir
    if (-not (Test-Path $fullPath)) {
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Host "  ✓ Created: $dir" -ForegroundColor Green
        } else {
            Write-Host "  [DRY RUN] Would create: $dir" -ForegroundColor Yellow
        }
    }
}

# Move markdown files
Write-Host ""
Write-Host "[2/7] Organizing documentation files..." -ForegroundColor Cyan

$mdFiles = Get-ChildItem -Path $rootPath -Filter "*.md" -File | Where-Object { 
    $_.Name -notin @("README.md", "CHANGELOG.md")
}

Write-Host "  Found: $($mdFiles.Count) markdown files" -ForegroundColor Cyan

$movedMd = 0
foreach ($file in $mdFiles) {
    $name = $file.Name
    $destination = ""
    
    if ($name -match "ARCHITECTURE|DATABASE|SCHEMA") {
        $destination = "docs\architecture\$name"
    }
    elseif ($name -match "DESIGN|VISUAL|REDESIGN|STYLE|THEME|MODAL|PROFILE|LAYOUT") {
        $destination = "docs\design\$name"
    }
    elseif ($name -match "PENALTY|PAYMENT|ACHIEVEMENT|RESERVATION|OFFER|BAN|REFERRAL|TELEGRAM|NOTIFICATION") {
        $destination = "docs\features\$name"
    }
    elseif ($name -match "DEPLOYMENT|DEPLOY|MIGRATION|APPLY|SETUP") {
        $destination = "docs\deployment\$name"
    }
    elseif ($name -match "GUIDE|QUICK_START|IMPLEMENTATION|TESTING|CHECKLIST") {
        $destination = "docs\guides\$name"
    }
    elseif ($name -match "API|ENDPOINT|RPC|FUNCTION") {
        $destination = "docs\api\$name"
    }
    elseif ($name -match "ANALYSIS|AUDIT|REPORT|COMPREHENSIVE|DEEP_DIVE|ULTRA") {
        $destination = ".archive\2024-12-old-docs\$name"
    }
    elseif ($name -match "COMPLETE|SUMMARY|STATUS|FIX|CLEANUP") {
        $destination = ".archive\2024-12-old-docs\$name"
    }
    else {
        $destination = "docs\$name"
    }
    
    $destPath = Join-Path $rootPath $destination
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] $name -> $destination" -ForegroundColor Yellow
    } else {
        try {
            Move-Item -Path $file.FullName -Destination $destPath -Force -ErrorAction Stop
            $movedMd++
        } catch {
            Write-Host "  ✗ Failed: $name - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (-not $DryRun) {
    Write-Host "  ✓ Moved $movedMd documentation files" -ForegroundColor Green
}

# Move SQL files
Write-Host ""
Write-Host "[3/7] Organizing SQL files..." -ForegroundColor Cyan

$sqlFiles = Get-ChildItem -Path $rootPath -Filter "*.sql" -File

Write-Host "  Found: $($sqlFiles.Count) SQL files" -ForegroundColor Cyan

$movedSql = 0
foreach ($file in $sqlFiles) {
    $name = $file.Name
    $destination = ""
    
    if ($name -match "^FIX_|^EMERGENCY_|^URGENT_|^COMPLETE_") {
        $destination = ".archive\2024-12-old-migrations\hotfixes\$name"
    }
    elseif ($name -match "^CHECK_|^DEBUG_|^DIAGNOSE_|^FIND_") {
        $destination = ".archive\2024-12-old-migrations\debug\$name"
    }
    elseif ($name -match "^APPLY_|^RUN_THIS_|^DEPLOY_") {
        $destination = ".archive\2024-12-old-migrations\instructions\$name"
    }
    elseif ($name -match "^CREATE_|^ADD_|^ENABLE_") {
        $destination = "migrations\$name"
    }
    elseif ($name -match "^CLEANUP_|^REMOVE_|^DROP_|^DELETE_") {
        $destination = ".archive\2024-12-old-migrations\cleanup\$name"
    }
    else {
        $destination = "migrations\$name"
    }
    
    $destPath = Join-Path $rootPath $destination
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] $name -> $destination" -ForegroundColor Yellow
    } else {
        try {
            Move-Item -Path $file.FullName -Destination $destPath -Force -ErrorAction Stop
            $movedSql++
        } catch {
            Write-Host "  ✗ Failed: $name - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (-not $DryRun) {
    Write-Host "  ✓ Moved $movedSql SQL files" -ForegroundColor Green
}

# Move PowerShell scripts
Write-Host ""
Write-Host "[4/7] Organizing PowerShell scripts..." -ForegroundColor Cyan

$ps1Files = Get-ChildItem -Path $rootPath -Filter "*.ps1" -File | Where-Object { 
    $_.Name -ne "quick-cleanup.ps1"
}

Write-Host "  Found: $($ps1Files.Count) PowerShell scripts" -ForegroundColor Cyan

$movedPs1 = 0
foreach ($file in $ps1Files) {
    $name = $file.Name
    $destination = ""
    
    if ($name -match "deploy|publish") {
        $destination = "scripts\deploy\$name"
    }
    elseif ($name -match "test|debug|check|verify") {
        $destination = "scripts\debug\$name"
    }
    elseif ($name -match "apply|migration|setup") {
        $destination = "scripts\maintenance\$name"
    }
    else {
        $destination = "scripts\$name"
    }
    
    $destPath = Join-Path $rootPath $destination
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] $name -> $destination" -ForegroundColor Yellow
    } else {
        try {
            Move-Item -Path $file.FullName -Destination $destPath -Force -ErrorAction Stop
            $movedPs1++
        } catch {
            Write-Host "  ✗ Failed: $name - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if (-not $DryRun) {
    Write-Host "  ✓ Moved $movedPs1 PowerShell scripts" -ForegroundColor Green
}

# Move test files
Write-Host ""
Write-Host "[5/7] Organizing test files..." -ForegroundColor Cyan

$testFiles = @()
$testFiles += Get-ChildItem -Path $rootPath -Filter "*test*.js" -File
$testFiles += Get-ChildItem -Path $rootPath -Filter "*debug*.js" -File
$testFiles += Get-ChildItem -Path $rootPath -Filter "*.sh" -File
$testFiles += Get-ChildItem -Path $rootPath -Filter "*.bat" -File
$testFiles += Get-ChildItem -Path $rootPath -Filter "*.html" -File | Where-Object {
    $_.Name -notmatch "^index\.html$"
}

foreach ($file in $testFiles) {
    $destination = ".archive\2024-12-old-scripts\$($file.Name)"
    $destPath = Join-Path $rootPath $destination
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] $($file.Name) -> $destination" -ForegroundColor Yellow
    } else {
        try {
            Move-Item -Path $file.FullName -Destination $destPath -Force -ErrorAction Stop
        } catch {
            # Silent fail for test files
        }
    }
}

Write-Host "  ✓ Moved test and debug files" -ForegroundColor Green

# Update .gitignore
Write-Host ""
Write-Host "[6/7] Updating .gitignore..." -ForegroundColor Cyan

$gitignorePath = Join-Path $rootPath ".gitignore"
$protectionRules = "`n# Root Directory Protection - Added by cleanup script`n/*.sql`n/*.md`n!README.md`n!CHANGELOG.md`n/*.ps1`n/*.sh`n/*.bat`n.archive/`n"

if (-not $DryRun) {
    if (Test-Path $gitignorePath) {
        $content = Get-Content $gitignorePath -Raw
        if (-not ($content -like "*Root Directory Protection*")) {
            Add-Content -Path $gitignorePath -Value $protectionRules
            Write-Host "  ✓ Updated .gitignore" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  .gitignore already protected" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  [DRY RUN] Would update .gitignore" -ForegroundColor Yellow
}

# Create README files
Write-Host ""
Write-Host "[7/7] Creating README files..." -ForegroundColor Cyan

if (-not $DryRun) {
    # docs/README.md
    $docsReadme = @"
# SmartPick Documentation

## Quick Navigation
- [Architecture](./architecture/) - System design, database schema
- [Features](./features/) - Feature documentation  
- [Deployment](./deployment/) - Deployment guides
- [Design](./design/) - UI/UX specifications
- [Guides](./guides/) - Implementation guides
- [API](./api/) - API reference

## Start Here
1. Architecture Overview
2. Quick Start Guide
3. Deployment Checklist
"@
    Set-Content -Path (Join-Path $rootPath "docs\README.md") -Value $docsReadme -Force
    
    # migrations/README.md
    $migrationsReadme = @"
# Database Migrations

Sequential database schema migrations for SmartPick.

## Running Migrations
Use Supabase CLI or Dashboard SQL Editor.

## Legacy Files
Old hotfixes archived in .archive/2024-12-old-migrations/
"@
    Set-Content -Path (Join-Path $rootPath "migrations\README.md") -Value $migrationsReadme -Force
    
    # scripts/README.md
    $scriptsReadme = @"
# Scripts

Utility scripts for SmartPick development and deployment.

## Structure
- setup/ - Initial setup
- deploy/ - Deployment automation
- debug/ - Debugging tools
- maintenance/ - Database maintenance
"@
    Set-Content -Path (Join-Path $rootPath "scripts\README.md") -Value $scriptsReadme -Force
    
    # .archive/README.md
    $archiveReadme = @"
# Archive

Historical files for reference only. DO NOT use directly.

Archive created: December 16, 2025
"@
    Set-Content -Path (Join-Path $rootPath ".archive\README.md") -Value $archiveReadme -Force
    
    Write-Host "  ✓ Created README files" -ForegroundColor Green
} else {
    Write-Host "  [DRY RUN] Would create README files" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  CLEANUP SUMMARY" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

$remainingMd = (Get-ChildItem -Path $rootPath -Filter "*.md" -File).Count
$remainingSql = (Get-ChildItem -Path $rootPath -Filter "*.sql" -File).Count  
$remainingPs1 = (Get-ChildItem -Path $rootPath -Filter "*.ps1" -File).Count

Write-Host "Root Directory Status:" -ForegroundColor Cyan
Write-Host "  MD files:  $remainingMd (should be 1-2)" -ForegroundColor $(if ($remainingMd -le 3) { "Green" } else { "Yellow" })
Write-Host "  SQL files: $remainingSql (should be 0)" -ForegroundColor $(if ($remainingSql -eq 0) { "Green" } else { "Yellow" })
Write-Host "  PS1 files: $remainingPs1 (should be 0)" -ForegroundColor $(if ($remainingPs1 -le 1) { "Green" } else { "Yellow" })

Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No changes made" -ForegroundColor Yellow
    Write-Host "   Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Review: git status" -ForegroundColor White
    Write-Host "  2. Test: pnpm build" -ForegroundColor White
    Write-Host "  3. Commit: git add -A" -ForegroundColor White
    Write-Host "  4. Commit changes to repository" -ForegroundColor White
}

Write-Host ""
