@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ or 24 LTS first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Run npm ci in this folder first.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173/ in your browser.
echo Keep this window open. Press Ctrl+C to stop Toolkit.
call npm run local
pause
