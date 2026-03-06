@echo off
chcp 65001 >nul 2>&1
title jasoseo-machine

echo.
echo  =============================================
echo     jasoseo-machine starting...
echo     Close this window to quit the app.
echo  =============================================
echo.

cd /d "%~dp0jasoseo-machine"
if errorlevel 1 (
    echo [ERROR] Failed to change directory to jasoseo-machine
    pause
    exit /b 1
)

echo Current directory: %cd%
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please install Node.js first.
    echo Download: https://nodejs.org
    pause
    exit /b 1
)

call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] App exited with an error.
    pause
)
