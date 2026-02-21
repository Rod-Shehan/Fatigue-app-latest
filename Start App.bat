@echo off
title Fatigue App

echo.
echo Batch file is running. Please wait...
echo.
cd /d "%~dp0"
echo Working folder: %cd%
echo.
timeout /t 2 /nobreak >nul

echo === Fatigue App - Start ===
echo.

echo Step 1: Checking for Node.js...
node --version 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js not found.
    echo   Install from https://nodejs.org - choose LTS - then try again.
    goto end
)
echo   [OK] Node.js is installed.
echo.

echo Step 2: Installing packages (first time may take 1-2 minutes)...
call npm install
if errorlevel 1 (
    echo   [FAIL] npm install failed.
    goto end
)
echo   [OK] Packages ready.
echo.

echo Step 3: Opening the server in a new window...
start "Fatigue App Server" "%~dp0run-server.bat"
echo   Look for a second window titled "Fatigue App Server". KEEP IT OPEN.
echo.

echo Step 4: Waiting 15 seconds for the server to start...
timeout /t 15 /nobreak >nul

echo Step 5: Opening your browser...
start "" "http://localhost:5173"
echo.
echo === Done ===
echo If the browser shows Connection Failed, wait 10 seconds and press F5.
goto end

:end
echo.
echo Press any key to close this window...
pause >nul
