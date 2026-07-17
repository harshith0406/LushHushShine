@echo off
echo =====================================================================
echo Starting Vendor Analytics & Retail Intelligence Platform Ecosystem...
echo =====================================================================
echo.

start "1. Express Backend" cmd /k "cd /d %~dp0backend && npm start"
start "2. Python AI Engine" cmd /k "cd /d %~dp0ai_service && uvicorn main:app --reload --port 8000"
start "3. React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo All three servers launched successfully in separate terminals.
echo - Express Backend: http://localhost:5000 (fallback 5002)
echo - Python AI Engine: http://127.0.0.1:8000
echo - React Frontend: http://localhost:5173
echo.
pause
