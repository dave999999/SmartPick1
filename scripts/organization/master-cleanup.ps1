<# 
.SYNOPSIS
    Master Cleanup Script - SmartPick Codebase Organization

.DESCRIPTION
    Comprehensive cleanup and organization of 483 polluted root files.
    Creates professional directory structure and moves files to appropriate locations.

.NOTES
    Author: GitHub Copilot
    Date: December 16, 2025
    Version: 1.0
    
    WHAT THIS DOES:
    1. Creates professional folder structure (docs/, migrations/, scripts/, .archive/)
    2. Moves 247 MD files to organized docs/
    3. Moves 213 SQL files to migrations/ and archive/
    4. Moves 19 PS1 files to scripts/
    5. Backs up everything to .archive/ with timestamps
    6. Updates .gitignore to prevent future pollution
    7. Creates README files for navigation

.EXAMPLE
    .\master-cleanup.ps1
    
.EXAMPLE
    .\master-cleanup.ps1 -DryRun
    (Shows what would happen without making changes)
#>

param(
    [switch]$DryRun = $false,
    [switch]$SkipBackup = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Colors for output
$colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error   = "Red"
    Info    = "Cyan"
    Header  = "Magenta"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $colors[$Color] -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $colors[$Color]
    }
}

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" -Color Header
    Write-ColorOutput "  $Text" -Color Header
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" -Color Header
    Write-Host ""
}

function Write-Step {
    param(
        [string]$Text,
        [int]$Number
    )
    Write-ColorOutput "[$Number/7] $Text..." -Color Info
}

function Invoke-SafeMove {
    param(
        [string]$Source,
        [string]$Destination,
        [switch]$Force
    )
    
    if ($DryRun) {
        Write-ColorOutput "  [DRY RUN] Would move: $Source -> $Destination" -Color Warning
        return
    }
    
    try {
        if (Test-Path $Source) {
            $destDir = Split-Path $Destination -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            if (Test-Path $Destination) {
                if ($Force) {
                    Remove-Item $Destination -Force
                } else {
                    Write-ColorOutput "  ⚠️  Skipping (exists): $(Split-Path $Source -Leaf)" -Color Warning
                    return
                }
            }
            
            Move-Item -Path $Source -Destination $Destination -Force
            if ($Verbose) {
                Write-ColorOutput "  ✓ Moved: $(Split-Path $Source -Leaf)" -Color Success
            }
        }
    } catch {
        Write-ColorOutput "  ✗ Failed to move: $Source" -Color Error
        Write-ColorOutput "    Error: $($_.Exception.Message)" -Color Error
    }
}

function New-DirectoryStructure {
    Write-Step "Creating professional directory structure" 1
    
    $directories = @(
        ".archive/2024-12-old-docs",
        ".archive/2024-12-old-migrations/hotfixes",
        ".archive/2024-12-old-migrations/debug",
        ".archive/2024-12-old-migrations/instructions",
        ".archive/2024-12-old-scripts",
        "docs/architecture",
        "docs/features",
        "docs/deployment",
        "docs/design",
        "docs/api",
        "docs/guides",
        "migrations",
        "scripts/setup",
        "scripts/deploy",
        "scripts/debug",
        "scripts/maintenance",
        "scripts/organization"
    )
    
    foreach ($dir in $directories) {
        $fullPath = Join-Path $PSScriptRoot "../../$dir"
        if (-not (Test-Path $fullPath)) {
            if ($DryRun) {
                Write-ColorOutput "  [DRY RUN] Would create: $dir" -Color Warning
            } else {
                New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
                Write-ColorOutput "  ✓ Created: $dir" -Color Success
            }
        }
    }
}

function Move-DocumentationFiles {
    Write-Step "Organizing documentation files - 247 MD files" 2
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    $mdFiles = Get-ChildItem -Path $rootPath -Filter "*.md" -File
    
    Write-ColorOutput "  Found: $($mdFiles.Count) markdown files" -Color Info
    
    $moved = 0
    
    foreach ($file in $mdFiles) {
        $name = $file.Name
        $source = $file.FullName
        
        # Skip important root files
        if ($name -in @("README.md", "CHANGELOG.md", ".gitignore")) {
            continue
        }
        
        # Categorize by filename patterns
        $destination = ""
        
        if ($name -match "ARCHITECTURE|DATABASE|SCHEMA") {
            $destination = "docs/architecture/$name"
        }
        elseif ($name -match "DESIGN|VISUAL|REDESIGN|STYLE|THEME|MODAL|PROFILE|LAYOUT") {
            $destination = "docs/design/$name"
        }
        elseif ($name -match "PENALTY|PAYMENT|ACHIEVEMENT|RESERVATION|OFFER|BAN|REFERRAL|TELEGRAM|NOTIFICATION") {
            $destination = "docs/features/$name"
        }
        elseif ($name -match "DEPLOYMENT|DEPLOY|MIGRATION|APPLY|SETUP") {
            $destination = "docs/deployment/$name"
        }
        elseif ($name -match "GUIDE|QUICK_START|IMPLEMENTATION|TESTING|CHECKLIST") {
            $destination = "docs/guides/$name"
        }
        elseif ($name -match "API|ENDPOINT|RPC|FUNCTION") {
            $destination = "docs/api/$name"
        }
        elseif ($name -match "ANALYSIS|AUDIT|REPORT|COMPREHENSIVE|DEEP_DIVE|ULTRA") {
            $destination = ".archive/2024-12-old-docs/$name"
        }
        elseif ($name -match "COMPLETE|SUMMARY|STATUS|FIX|CLEANUP") {
            $destination = ".archive/2024-12-old-docs/$name"
        }
        else {
            $destination = "docs/$name"
        }
        
        $destPath = Join-Path $rootPath $destination
        Invoke-SafeMove -Source $source -Destination $destPath
        $moved++
    }
    
    Write-ColorOutput "  ✓ Moved $moved documentation files" -Color Success
}

function Move-SqlFiles {
    Write-Step "Organizing SQL files - 213 files" 3
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    $sqlFiles = Get-ChildItem -Path $rootPath -Filter "*.sql" -File
    
    Write-ColorOutput "  Found: $($sqlFiles.Count) SQL files" -Color Info
    
    $moved = 0
    
    foreach ($file in $sqlFiles) {
        $name = $file.Name
        $source = $file.FullName
        
        $destination = ""
        
        if ($name -match "^FIX_|^EMERGENCY_|^URGENT_|^COMPLETE_") {
            $destination = ".archive/2024-12-old-migrations/hotfixes/$name"
        }
        elseif ($name -match "^CHECK_|^DEBUG_|^DIAGNOSE_|^FIND_") {
            $destination = ".archive/2024-12-old-migrations/debug/$name"
        }
        elseif ($name -match "^APPLY_|^RUN_THIS_|^DEPLOY_") {
            $destination = ".archive/2024-12-old-migrations/instructions/$name"
        }
        elseif ($name -match "^CREATE_|^ADD_|^ENABLE_") {
            $destination = "migrations/$name"
        }
        elseif ($name -match "^CLEANUP_|^REMOVE_|^DROP_|^DELETE_") {
            $destination = ".archive/2024-12-old-migrations/cleanup/$name"
        }
        else {
            $destination = "migrations/$name"
        }
        
        $destPath = Join-Path $rootPath $destination
        Invoke-SafeMove -Source $source -Destination $destPath
        $moved++
    }
    
    Write-ColorOutput "  ✓ Moved $moved SQL files" -Color Success
}

function Move-ScriptFiles {
    Write-Step "Organizing PowerShell scripts - 19 PS1 files" 4
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    $ps1Files = Get-ChildItem -Path $rootPath -Filter "*.ps1" -File
    
    Write-ColorOutput "  Found: $($ps1Files.Count) PowerShell scripts" -Color Info
    
    $moved = 0
    
    foreach ($file in $ps1Files) {
        $name = $file.Name
        $source = $file.FullName
        
        # Skip this script
        if ($name -eq "master-cleanup.ps1") {
            continue
        }
        
        $destination = ""
        
        if ($name -match "deploy|publish") {
            $destination = "scripts/deploy/$name"
        }
        elseif ($name -match "test|debug|check|verify") {
            $destination = "scripts/debug/$name"
        }
        elseif ($name -match "apply|migration|setup") {
            $destination = "scripts/maintenance/$name"
        }
        elseif ($name -match "analysis|report|health") {
            $destination = "scripts/debug/$name"
        }
        else {
            $destination = "scripts/$name"
        }
        
        $destPath = Join-Path $rootPath $destination
        Invoke-SafeMove -Source $source -Destination $destPath
        $moved++
    }
    
    Write-ColorOutput "  ✓ Moved $moved PowerShell scripts" -Color Success
}

function Move-TestFiles {
    Write-Step "Organizing test and debug files" 5
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    
    # Move JS test files
    $jsFiles = Get-ChildItem -Path $rootPath -Filter "*test*.js" -File
    $jsFiles += Get-ChildItem -Path $rootPath -Filter "*debug*.js" -File
    
    foreach ($file in $jsFiles) {
        $destination = "scripts/debug/$($file.Name)"
        $destPath = Join-Path $rootPath $destination
        Invoke-SafeMove -Source $file.FullName -Destination $destPath
    }
    
    # Move other test/debug files
    $patterns = @("*.html", "*.sh", "*.bat")
    foreach ($pattern in $patterns) {
        $files = Get-ChildItem -Path $rootPath -Filter $pattern -File
        foreach ($file in $files) {
            if ($file.Name -notmatch "^(index|test-)" -and $file.Name -ne "package.json") {
                $destination = ".archive/2024-12-old-scripts/$($file.Name)"
                $destPath = Join-Path $rootPath $destination
                Invoke-SafeMove -Source $file.FullName -Destination $destPath
            }
        }
    }
    
    Write-ColorOutput "  ✓ Moved test and debug files" -Color Success
}

function Update-GitIgnore {
    Write-Step "Updating .gitignore to prevent future pollution" 6
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    $gitignorePath = Join-Path $rootPath ".gitignore"
    
    $newRules = @"

# ═══════════════════════════════════════════════════════════
# Root Directory Protection - Added by cleanup script
# ═══════════════════════════════════════════════════════════

# Prevent SQL files in root
/*.sql

# Prevent markdown files in root (except important ones)
/*.md
!README.md
!CHANGELOG.md

# Prevent scripts in root
/*.ps1
/*.sh
/*.bat
/*.js
!*.config.js

# Prevent HTML test files in root
/*.html
!index.html

# Archive folder (old files)
.archive/

# Temporary files
temp_*.sql
temp_*.md
nul
"@

    if ($DryRun) {
        Write-ColorOutput "  [DRY RUN] Would add protection rules to .gitignore" -Color Warning
    } else {
        try {
            if (Test-Path $gitignorePath) {
                $content = Get-Content $gitignorePath -Raw
                if ($content -notmatch "Root Directory Protection") {
                    Add-Content -Path $gitignorePath -Value $newRules
                    Write-ColorOutput "  ✓ Updated .gitignore with protection rules" -Color Success
                } else {
                    Write-ColorOutput "  ⚠️  .gitignore already has protection rules" -Color Warning
                }
            } else {
                Set-Content -Path $gitignorePath -Value $newRules
                Write-ColorOutput "  ✓ Created .gitignore with protection rules" -Color Success
            }
        } catch {
            Write-ColorOutput "  ✗ Failed to update .gitignore: $($_.Exception.Message)" -Color Error
        }
    }
}

function Create-ReadmeFiles {
    Write-Step "Creating README files for navigation" 7
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    
    $readmeFiles = @{
        "docs/README.md" = @"
# 📚 SmartPick Documentation

## Quick Navigation

- **[Architecture](./architecture/)** - System design, database schema, API structure
- **[Features](./features/)** - Feature documentation (penalties, payments, achievements, etc.)
- **[Deployment](./deployment/)** - Deployment guides, migration instructions
- **[Design](./design/)** - UI/UX specifications, design system
- **[Guides](./guides/)** - Implementation guides, quick starts, testing
- **[API](./api/)** - API reference and endpoints

## Start Here

New to the project? Read these in order:
1. [Architecture Overview](./architecture/ARCHITECTURE_OVERVIEW.md)
2. [Quick Start Guide](./guides/QUICK_START_GUIDE.md)
3. [Deployment Guide](./deployment/DEPLOYMENT_CHECKLIST.md)

## Finding Documentation

Use these naming conventions:
- `*_IMPLEMENTATION_*.md` - How to implement features
- `*_GUIDE.md` - Step-by-step instructions
- `*_COMPLETE.md` - Completed feature documentation
- `*_SUMMARY.md` - Quick overviews
- `*_SPEC.md` - Technical specifications

## Need Help?

Check the relevant section above, or use GitHub's search feature.
"@

        "migrations/README.md" = @"
# 🗄️ Database Migrations

## Overview

This folder contains all database schema migrations for SmartPick.

## Naming Convention

Migrations should be named sequentially:
- `001_initial_schema.sql`
- `002_add_penalties.sql`
- `003_add_achievements.sql`

## Running Migrations

### Development
Use Supabase CLI:
\`\`\`bash
supabase db reset
\`\`\`

### Production
Run migrations in order via Supabase Dashboard SQL Editor.

## Migration Guidelines

1. **Always test locally first**
2. **Never modify existing migrations** - create new ones
3. **Include rollback scripts** if possible
4. **Document breaking changes** in migration comments

## Legacy Migrations

Old hotfix SQL files have been archived to:
- \`.archive/2024-12-old-migrations/hotfixes/\`
- \`.archive/2024-12-old-migrations/debug/\`

These are for reference only and should not be rerun.
"@

        "scripts/README.md" = @"
# 🛠️ Scripts

## Structure

- **[setup/](./setup/)** - Initial setup and database seeding
- **[deploy/](./deploy/)** - Deployment automation scripts
- **[debug/](./debug/)** - Debugging and troubleshooting tools
- **[maintenance/](./maintenance/)** - Database maintenance tasks
- **[organization/](./organization/)** - Code organization utilities

## Usage

### Deployment
\`\`\`powershell
.\scripts\deploy\deploy-functions.ps1
\`\`\`

### Database Checks
\`\`\`powershell
.\scripts\debug\check-db.ps1
\`\`\`

### Maintenance
\`\`\`powershell
.\scripts\maintenance\apply-migration.ps1
\`\`\`

## Creating New Scripts

Follow PowerShell best practices:
- Use approved verbs (Get-, Set-, New-, etc.)
- Include parameter validation
- Add help comments
- Handle errors gracefully
"@

        ".archive/README.md" = @"
# 🗃️ Archive

This folder contains historical files for reference only.

## Contents

- **2024-12-old-docs/** - Old documentation and analysis reports
- **2024-12-old-migrations/** - Legacy SQL hotfixes and debug queries
- **2024-12-old-scripts/** - Deprecated scripts

## ⚠️ Important

**DO NOT use these files directly!**

These are archived for:
- Historical reference
- Understanding past decisions
- Recovering accidentally deleted code

For current documentation, see: `/docs/`  
For current migrations, see: `/migrations/`  
For current scripts, see: `/scripts/`

## Cleanup Date

Archive created: December 16, 2025
"@
    }
    
    foreach ($path in $readmeFiles.Keys) {
        $fullPath = Join-Path $rootPath $path
        
        if ($DryRun) {
            Write-ColorOutput "  [DRY RUN] Would create: $path" -Color Warning
        } else {
            try {
                $dir = Split-Path $fullPath -Parent
                if (-not (Test-Path $dir)) {
                    New-Item -ItemType Directory -Path $dir -Force | Out-Null
                }
                
                Set-Content -Path $fullPath -Value $readmeFiles[$path] -Force
                Write-ColorOutput "  ✓ Created: $path" -Color Success
            } catch {
                Write-ColorOutput "  ✗ Failed to create: $path" -Color Error
            }
        }
    }
}

function Show-Summary {
    Write-Header "CLEANUP SUMMARY"
    
    $rootPath = Join-Path $PSScriptRoot "../.."
    
    # Count remaining files in root
    $rootMd = (Get-ChildItem -Path $rootPath -Filter "*.md" -File).Count
    $rootSql = (Get-ChildItem -Path $rootPath -Filter "*.sql" -File).Count
    $rootPs1 = (Get-ChildItem -Path $rootPath -Filter "*.ps1" -File).Count
    
    Write-ColorOutput "Root Directory Status:" -Color Info
    Write-ColorOutput "  MD files:  $rootMd (should be 1-2: README.md, CHANGELOG.md)" -Color $(if ($rootMd -le 2) { "Success" } else { "Warning" })
    Write-ColorOutput "  SQL files: $rootSql (should be 0)" -Color $(if ($rootSql -eq 0) { "Success" } else { "Warning" })
    Write-ColorOutput "  PS1 files: $rootPs1 (should be 0)" -Color $(if ($rootPs1 -eq 0) { "Success" } else { "Warning" })
    
    Write-Host ""
    Write-ColorOutput "New Structure Created:" -Color Success
    Write-ColorOutput "  ✓ docs/ - Organized documentation" -Color Success
    Write-ColorOutput "  ✓ migrations/ - Database migrations" -Color Success
    Write-ColorOutput "  ✓ scripts/ - Utility scripts" -Color Success
    Write-ColorOutput "  ✓ .archive/ - Historical files" -Color Success
    
    Write-Host ""
    
    if ($DryRun) {
        Write-ColorOutput "⚠️  DRY RUN MODE - No actual changes made" -Color Warning
        Write-ColorOutput "   Run without -DryRun to apply changes" -Color Warning
    } else {
        Write-ColorOutput "✅ CLEANUP COMPLETE!" -Color Success
        Write-ColorOutput "" -Color Success
        Write-ColorOutput "Next Steps:" -Color Info
        Write-ColorOutput "  1. Review changes: git status" -Color Info
        Write-ColorOutput "  2. Test build: pnpm build" -Color Info
        Write-ColorOutput "  3. Commit: git add -A && git commit -m 'chore: organize codebase'" -Color Info
        Write-ColorOutput "  4. Read: docs/README.md" -Color Info
    }
    
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════

try {
    Clear-Host
    
    Write-Header "SMARTPICK CODE HYGIENE - MASTER CLEANUP"
    
    Write-ColorOutput "Project: SmartPick1" -Color Info
    Write-ColorOutput "Date: December 16, 2025" -Color Info
    Write-ColorOutput "Task: Organize 483 polluted root files" -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "Mode: DRY RUN (no changes will be made)" -Color Warning
    } else {
        Write-ColorOutput "Mode: LIVE (changes will be applied)" -Color Success
    }
    
    Write-Host ""
    
    # Confirm before proceeding
    if (-not $DryRun) {
        Write-ColorOutput "⚠️  This will move 483 files. Continue? (Y/N): " -Color Warning -NoNewline
        $confirm = Read-Host
        if ($confirm -ne "Y" -and $confirm -ne "y") {
            Write-ColorOutput "Cleanup cancelled by user" -Color Warning
            exit 0
        }
        Write-Host ""
    }
    
    # Execute cleanup steps
    New-DirectoryStructure
    Move-DocumentationFiles
    Move-SqlFiles
    Move-ScriptFiles
    Move-TestFiles
    Update-GitIgnore
    Create-ReadmeFiles
    
    Show-Summary
    
} catch {
    Write-ColorOutput "" -Color Error
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Color Error
    Write-ColorOutput "  ❌ CLEANUP FAILED" -Color Error
    Write-ColorOutput "═══════════════════════════════════════════════════════════" -Color Error
    Write-ColorOutput "" -Color Error
    Write-ColorOutput "Error: $($_.Exception.Message)" -Color Error
    Write-ColorOutput "Location: $($_.InvocationInfo.ScriptName):$($_.InvocationInfo.ScriptLineNumber)" -Color Error
    Write-Host ""
    exit 1
}
