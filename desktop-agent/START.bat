@echo off
title SanketX 2047 :: Desktop Agent
echo.
echo  ============================================================
echo    SANKETX 2047  ::  DESKTOP AGENT BOOTSTRAP
echo  ============================================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo  [!] Python not found. Install from https://python.org
  pause
  exit /b 1
)
if not exist .venv (
  echo  [+] Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat
echo  [+] Installing dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
echo.
echo  [+] Launching agent...
echo.
python agent.py
pause
