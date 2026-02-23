# Step 2: Link Firebase project and deploy. Pass your Project ID.
# Run:  .\scripts\firebase-deploy.ps1 YOUR_PROJECT_ID
# Or:   scripts\firebase-deploy.cmd YOUR_PROJECT_ID

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ProjectId
)

$ErrorActionPreference = "Stop"
$appNext = $PSScriptRoot + "\.."
if (-not (Test-Path "$appNext\package.json")) {
    $appNext = "c:\Users\r_she\Documents\Fatigue app\app-next"
}
Set-Location $appNext

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
