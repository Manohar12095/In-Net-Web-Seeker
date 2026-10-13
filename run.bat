@echo off
setlocal

:: =======================================================================
:: In Net Web Seeker - Startup Launcher
:: Powered by IN NET Creations · Created by S. Manohar
:: =======================================================================

cd /d "%~dp0"
title In Net Web Seeker - Live Server

echo =======================================================================
echo   IN NET WEB SEEKER
echo   Collect. Analyze. Explore.
echo   Powered by IN NET Creations ^| Created by S. Manohar
echo =======================================================================
echo.

:: Add common paths to PATH if present
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe" (
    set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe;%PATH%"
)
if exist "%USERPROFILE%\.cargo\bin" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

:: Verify Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Verify Python runtime (.venv, uv, or python)
set "PYTHON_FOUND=0"
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_FOUND=1"
) else (
    where uv >nul 2>nul
    if not errorlevel 1 set "PYTHON_FOUND=1"
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_FOUND=1"
)

if "%PYTHON_FOUND%"=="0" (
    echo [ERROR] No Python environment found.
    echo Please install Python 3.12+ or uv from https://docs.astral.sh/uv
    echo.
    pause
    exit /b 1
)

echo [*] Environment verified: Node.js and Python runtime ready.
echo [*] Starting Python FastAPI Engine at 127.0.0.1:8765
echo [*] Starting Vite Frontend at 127.0.0.1:1420
echo [*] Opening application in your default web browser...
echo [*] Press Ctrl+C at any time in this window to stop both servers.
echo.

:: Launch browser after short delay in background
start "" cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:1420"

:: Start both engine and UI concurrently
call npm run dev:all

if errorlevel 1 (
    echo.
    echo [!] Server exited with an error.
    pause
)
