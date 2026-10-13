@echo off
setlocal enabledelayedexpansion

:: =======================================================================
:: In Net Web Seeker - Robust Local Startup Launcher
:: Powered by IN NET Creations · Created by S. Manohar
:: =======================================================================

cd /d "%~dp0"
title In Net Web Seeker - Local Dev & Intelligence Engine

echo =======================================================================
echo   IN NET WEB SEEKER
echo   Collect. Analyze. Explore.
echo   Powered by IN NET Creations ^| Created by S. Manohar
echo =======================================================================
echo.

:: Add common paths to PATH if present (uv, cargo, local python)
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe" (
    set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe;!PATH!"
)
if exist "%USERPROFILE%\.cargo\bin" (
    set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"
)

:: 1. Verify Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js (v18+) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [*] Node.js found: !NODE_VER!

:: 2. Check if node_modules exists, install if missing
if not exist "%~dp0node_modules\" (
    echo [*] node_modules not detected. Installing dependencies (npm install)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
)

:: 3. Verify / Prepare Python Virtual Environment
set "PYTHON_EXEC="
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXEC=%~dp0backend\.venv\Scripts\python.exe"
    echo [*] Python virtual environment ready: backend\.venv
) else (
    echo [*] backend\.venv not detected. Attempting automatic setup...
    where uv >nul 2>nul
    if not errorlevel 1 (
        echo [*] Using uv to initialize backend virtualenv...
        pushd "%~dp0backend"
        call uv venv
        if exist "%~dp0requirements.txt" call uv pip install -r "%~dp0requirements.txt"
        popd
        if exist "%~dp0backend\.venv\Scripts\python.exe" set "PYTHON_EXEC=%~dp0backend\.venv\Scripts\python.exe"
    ) else (
        where python >nul 2>nul
        if not errorlevel 1 (
            echo [*] Using system Python to initialize backend virtualenv...
            pushd "%~dp0backend"
            call python -m venv .venv
            call .venv\Scripts\python.exe -m pip install -r "%~dp0requirements.txt" 2>nul
            popd
            if exist "%~dp0backend\.venv\Scripts\python.exe" set "PYTHON_EXEC=%~dp0backend\.venv\Scripts\python.exe"
        )
    )
)

if "!PYTHON_EXEC!"=="" (
    where python >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] No Python runtime or virtual environment found.
        echo Please install Python 3.12+ from https://python.org or uv from https://docs.astral.sh/uv
        echo.
        pause
        exit /b 1
    )
    echo [!] Using system python from PATH.
)

:: 4. Ensure local development data directory exists
if not exist "%~dp0.dev-data\" (
    mkdir "%~dp0.dev-data" 2>nul
)

echo.
echo =======================================================================
echo   LAUNCHING LOCAL DEVELOPMENT STACK
echo   - Backend FastAPI Engine:  http://127.0.0.1:8765
echo   - Frontend Vite Web App:   http://localhost:1420
echo   - Local Storage Cache:     %~dp0.dev-data\
echo =======================================================================
echo [*] Opening application in your default web browser...
echo [*] Press Ctrl+C at any time in this window to stop both servers.
echo.

:: 5. Launch default browser after 3 second delay
start "" cmd /c "timeout /t 3 /nobreak >nul 2>nul || ping -n 4 127.0.0.1 >nul & start http://localhost:1420"

:: 6. Run both engine and frontend concurrently
call npm run dev:all

if errorlevel 1 (
    echo.
    echo [!] Server exited with an error.
    pause
)
