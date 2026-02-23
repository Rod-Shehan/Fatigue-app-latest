@echo off
REM Firebase setup - run from app-next folder: scripts\firebase-setup.cmd
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0firebase-setup.ps1"
pause
