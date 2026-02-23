@echo off
if "%~1"=="" (
  echo Usage: scripts\firebase-deploy.cmd YOUR_FIREBASE_PROJECT_ID
  echo Get Project ID: Firebase Console -^> Project settings -^> General -^> Project ID
  pause
  exit /b 1
)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0firebase-deploy.ps1" "%~1"
pause
