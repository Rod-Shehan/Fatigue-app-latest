@echo off
cd /d "%~dp0.."
echo Listing Firebase projects for your account...
echo.
npx firebase projects:list
echo.
echo Use the Project ID from the table above in:  scripts\firebase-deploy.cmd PROJECT_ID
pause
