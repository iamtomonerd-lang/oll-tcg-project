@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
echo.
echo Starting server...
start http://localhost:3000
call npm run server
pause
