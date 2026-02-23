# Firebase setup - Run in two steps (no interactive project list).
# Step 1:  .\scripts\firebase-login.ps1     (or firebase-login.cmd)
# Step 2:  .\scripts\firebase-deploy.ps1 YOUR_PROJECT_ID

param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectId
)

$ErrorActionPreference = "Stop"
$appNext = $PSScriptRoot + "\.."
if (-not (Test-Path "$appNext\package.json")) {
    $appNext = "c:\Users\r_she\Documents\Fatigue app\app-next"
}
Set-Location $appNext

if (-not $ProjectId) {
    Write-Host "Usage: .\scripts\firebase-setup.ps1 -ProjectId YOUR_FIREBASE_PROJECT_ID" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "First run:  .\scripts\firebase-login.cmd   (installs deps + opens browser to log in)" -ForegroundColor Cyan
    Write-Host "Then run:   .\scripts\firebase-deploy.cmd YOUR_PROJECT_ID" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Get your Project ID: Firebase Console -> Project settings -> General -> Project ID" -ForegroundColor Gray
    exit 1
}

$ProjectId = $ProjectId.Trim().ToLower()
Write-Host "=== Linking project: $ProjectId ===" -ForegroundColor Cyan
npx firebase use $ProjectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Enabling webframeworks (Next.js) ===" -ForegroundColor Cyan
npx firebase experiments:enable webframeworks
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Deploying to Firebase Hosting ===" -ForegroundColor Cyan
npx firebase deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone. Your app is live on Firebase Hosting." -ForegroundColor Green
