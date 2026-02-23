# List Firebase projects you have access to. Use a Project ID from this list when deploying.
$appNext = $PSScriptRoot + "\.."
Set-Location $appNext
Write-Host "Listing Firebase projects for your account..." -ForegroundColor Cyan
npx firebase projects:list
