# Step 1: Install deps and log in to Firebase (browser opens).
# Run:  scripts\firebase-login.cmd   from app-next folder

$ErrorActionPreference = "Stop"
$appNext = $PSScriptRoot + "\.."
if (-not (Test-Path "$appNext\package.json")) {
    $appNext = "c:\Users\r_she\Documents\Fatigue app\app-next"
}
Set-Location $appNext

Write-Host "=== 1. Installing dependencies ===" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Firebase login (browser will open - sign in with Google) ===" -ForegroundColor Cyan
npx firebase login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nLogin done. Next: run deploy with your Project ID." -ForegroundColor Green
Write-Host "  scripts\firebase-deploy.cmd YOUR_PROJECT_ID" -ForegroundColor White
Write-Host "  (Get Project ID: Firebase Console -> Project settings -> Project ID)" -ForegroundColor Gray
