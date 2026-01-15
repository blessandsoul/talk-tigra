# PowerShell script to convert @/ imports to relative .js imports
# This is a reference - the actual conversion will be done file by file

Write-Host "This script shows the pattern for converting imports:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pattern to find:" -ForegroundColor Cyan
Write-Host "  from '@/config/env'"
Write-Host "  from '@/libs/logger'"
Write-Host "  from '@/libs/db'"
Write-Host ""
Write-Host "Convert to relative paths with .js:" -ForegroundColor Green  
Write-Host "  from './config/env.js'  (if in src/)"
Write-Host "  from '../config/env.js' (if in src/subfolder/)"
Write-Host "  from '../../config/env.js' (if in src/subfolder/subfolder/)"
Write-Host ""
Write-Host "The conversion is being done manually for each file." -ForegroundColor Yellow
