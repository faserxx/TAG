@echo off
REM Batch startup script for Terminal Adventure Game
REM Runs both backend and frontend in development mode

echo ========================================
echo   Terminal Adventure Game - Startup
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        exit /b 1
    )
    echo.
)

echo Starting application...
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo Press Ctrl+C to stop the servers
echo.

REM Run the dev command
call npm run dev
