@echo off
title Backup Fatigue App
set SOURCE=%~dp0
set BACKUP_ROOT=%USERPROFILE%\Documents\Fatigue-app-backups
set DATE=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
set DEST=%BACKUP_ROOT%\Fatigue-app-%DATE%

echo.
echo Backing up Fatigue app to:
echo %DEST%
echo.

if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"
if not exist "%DEST%" mkdir "%DEST%"

xcopy "%SOURCE%*" "%DEST%\" /E /I /H /Y /EXCLUDE:%~dp0backup-exclude.txt 2>nul
if errorlevel 1 (
  xcopy "%SOURCE%*" "%DEST%\" /E /I /H /Y 2>nul
)

echo.
echo Backup done. Folder: %DEST%
echo.
pause
