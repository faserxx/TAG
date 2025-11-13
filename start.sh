#!/bin/bash
# Bash startup script for Terminal Adventure Game
# Runs both backend and frontend in development mode

echo "========================================"
echo "  Terminal Adventure Game - Startup"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

echo "Starting application..."
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Run the dev command
npm run dev
