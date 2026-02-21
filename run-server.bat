@echo off
title Fatigue App Server
cd /d "%~dp0"

echo.
echo Server window is open. Starting app...
echo Do NOT close this window while using the app.
echo.
npm run dev
echo.
echo Server stopped or had an error. See above.
echo Press any key to close this window...
pause >nul
