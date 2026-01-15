# PowerShell script to fix all @/ imports in TypeScript files
# Run this from the server directory: .\scripts\fix-all-imports.ps1

$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse | Where-Object { $_.Name -notlike "*.d.ts" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Calculate relative path depth based on file location
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\src\", "")
    $depth = ($relativePath.Split('\').Length - 1)
    $prefix = if ($depth -eq 0) { "./" } else { ("../" * $depth) }
    
    # Replace @/config/* imports
    $content = $content -replace "from '@/config/([^']+)'", "from '${prefix}config/`$1.js'"
    
    # Replace @/libs/* imports
    $content = $content -replace "from '@/libs/([^']+)'", "from '${prefix}libs/`$1.js'"
    
    # Replace @/modules/* imports  
    $content = $content -replace "from '@/modules/([^']+)'", "from '${prefix}modules/`$1.js'"
    
    # Replace @/utils/* imports
    $content = $content -replace "from '@/utils/([^']+)'", "from '${prefix}utils/`$1.js'"
    
    # Replace @/types/* imports
    $content = $content -replace "from '@/types/([^']+)'", "from '${prefix}types/`$1.js'"
    
    # Replace @/plugins/* imports
    $content = $content -replace "from '@/plugins/([^']+)'", "from '${prefix}plugins/`$1.js'"
    
    # Replace @/hooks/* imports
    $content = $content -replace "from '@/hooks/([^']+)'", "from '${prefix}hooks/`$1.js'"
    
    # Replace @/routes/* imports
    $content = $content -replace "from '@/routes/([^']+)'", "from '${prefix}routes/`$1.js'"
    
    # Replace @/workers/* imports
    $content = $content -replace "from '@/workers/([^']+)'", "from '${prefix}workers/`$1.js'"
    
    # Fix relative imports that don't have .js extension
    $content = $content -replace "from '\./([^']+)(?<!\.js)'", "from './`$1.js'"
    $content = $content -replace "from '\.\.\/([^']+)(?<!\.js)'", "from '../`$1.js'"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✓ Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`n✅ All imports have been converted!" -ForegroundColor Cyan
