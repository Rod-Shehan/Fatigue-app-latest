@echo off
title Fatigue App (Next.js)
echo.
echo Batch file started. Working folder: %~dp0
echo.

cd /d "%~dp0app-next"
if errorlevel 1 (
  echo ERROR: Could not open folder: %~dp0app-next
  pause
  exit /b 1
)
echo Now in folder: %cd%
echo.

echo === Fatigue App (Next.js - no Base44) ===
echo.

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not in your PATH.
  echo Install from https://nodejs.org ^(LTS^) then run this file again.
  echo.
  pause
  exit /b 1
)
echo Node.js found.
echo.

if not exist "node_modules" (
  echo Installing dependencies ^(first time may take 2-3 minutes^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check the messages above.
    echo.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env" (
  echo Creating .env from .env.example...
  copy .env.example .env
  echo.
  echo IMPORTANT: Edit app-next\.env in Notepad and set:
  echo   NEXTAUTH_SECRET=any-random-string
  echo   NEXTAUTH_CREDENTIALS_PASSWORD=your-login-password
  echo Then run this file again.
  echo.
  pause
  exit /b 0
)

echo Running Prisma...
call npx prisma generate
if errorlevel 1 (
  echo prisma generate failed.
  echo.
  pause
  exit /b 1
)
call npx prisma db push
if errorlevel 1 (
  echo prisma db push failed.
  echo.
  pause
  exit /b 1
)
echo.

echo Starting the Next.js server in a new window...
echo Keep that window OPEN. The app will open in your browser shortly.
echo.
start "Next.js - Fatigue App" cmd /k "cd /d ""%~dp0app-next"" && npm run dev"

echo Waiting 15 seconds for the server to start...
timeout /t 15 /nobreak >nul

echo Opening browser...
start "" "http://localhost:3000"

echo.
echo If the page shows "This site can't be reached" or does not load:
echo   1. Check the "Next.js - Fatigue App" window for errors.
echo   2. Wait 20 more seconds and refresh the browser ^(F5^).
echo.
echo When done, close the "Next.js - Fatigue App" window to stop the server.
echo.
pause
