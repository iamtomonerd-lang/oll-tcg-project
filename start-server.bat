@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo サーバーを起動しています...
timeout /t 2 /nobreak
npm run server
echo.
echo サーバーの起動に失敗しました
pause
