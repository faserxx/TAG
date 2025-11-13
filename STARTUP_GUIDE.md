# Startup Guide

This guide explains how to start the Terminal Adventure Game application.

## Quick Start

We've created convenient startup scripts for all platforms:

### Windows (PowerShell)
```powershell
.\start.ps1
```

### Windows (Command Prompt)
```cmd
start.bat
```

### Linux/Mac
```bash
chmod +x start.sh  # First time only
./start.sh
```

## What the Startup Scripts Do

1. **Check Dependencies**: Automatically runs `npm install` if `node_modules` folder doesn't exist
2. **Start Both Servers**: Launches backend and frontend concurrently
3. **Display URLs**: Shows where the application is accessible
4. **Handle Errors**: Exits gracefully if installation fails

## Expected Output

When you run the startup script, you should see:

```
========================================
  Terminal Adventure Game - Startup
========================================

Starting application...
  Frontend: http://localhost:3000
  Backend:  http://localhost:3001

Press Ctrl+C to stop the servers

[Backend output showing database initialization]
[Frontend output showing Vite dev server]
```

### First Startup vs. Subsequent Startups

**First Startup** (no existing database):
```
Creating new database...
Database initialized successfully
Demo adventure 'The Lost Temple' created
Server running on http://localhost:3001
```

**Subsequent Startups** (existing database found):
```
Loading existing database from file...
Database loaded successfully
Server running on http://localhost:3001
```

The database file is stored at `backend/data/game.db` and preserves all your adventures and game progress.

## Accessing the Application

Once both servers are running:

1. Open your browser
2. Navigate to: **http://localhost:3000**
3. You'll see the terminal interface with a welcome message
4. Start playing by typing commands like `help`, `look`, or `move north`

## Stopping the Application

Press `Ctrl+C` in the terminal where the startup script is running. This will stop both the frontend and backend servers.

## Troubleshooting

### Port Already in Use

If you see an error about ports 3000 or 3001 being in use:

1. Stop any other processes using these ports
2. Or modify the ports in:
   - `backend/src/index.ts` (change PORT constant)
   - `frontend/vite.config.ts` (change server.port and proxy target)

### Dependencies Not Installing

If `npm install` fails:

1. Make sure you have Node.js 18+ installed
2. Try running `npm install` manually
3. Check your internet connection
4. Clear npm cache: `npm cache clean --force`

### Backend Not Starting

If the backend fails to start:

1. Check the error message in the console
2. Ensure port 3001 is available
3. Try running backend manually: `npm run dev:backend`

### Frontend Not Starting

If the frontend fails to start:

1. Check the error message in the console
2. Ensure port 3000 is available
3. Try running frontend manually: `npm run dev:frontend`

### Database Issues

#### Database File Corrupted

If you see database errors on startup:

1. **Backup the corrupted file** (in case you need to recover data):
   ```bash
   cp backend/data/game.db backend/data/game.db.corrupted
   ```

2. **Delete the corrupted database**:
   ```bash
   rm backend/data/game.db        # Linux/Mac
   del backend\data\game.db       # Windows
   ```

3. **Restart the server** - a fresh database will be created automatically

#### Lost Adventures After Restart

If your adventures disappeared after a server restart:

1. **Check if database file exists**:
   ```bash
   ls backend/data/game.db        # Linux/Mac
   dir backend\data\game.db       # Windows
   ```

2. **Check file permissions** - ensure the server can read/write to `backend/data/`

3. **Check for error messages** in the server console during startup

4. **Verify the database path** - if you set `DB_PATH` environment variable, make sure it's correct

#### Reset to Fresh Database

To start over with a clean database:

```bash
# Stop the server (Ctrl+C)

# Delete the database file
rm backend/data/game.db        # Linux/Mac
del backend\data\game.db       # Windows

# Restart the server - demo adventure will be recreated
```

#### Backup and Restore Database

**Create a backup:**
```bash
cp backend/data/game.db backend/data/game.db.backup        # Linux/Mac
copy backend\data\game.db backend\data\game.db.backup      # Windows
```

**Restore from backup:**
```bash
# Stop the server first (Ctrl+C)
cp backend/data/game.db.backup backend/data/game.db        # Linux/Mac
copy backend\data\game.db.backup backend\data\game.db      # Windows
# Restart the server
```

#### Custom Database Location

To use a custom database location, set the `DB_PATH` environment variable before starting:

**Linux/Mac:**
```bash
export DB_PATH=/path/to/custom/database.db
./start.sh
```

**Windows PowerShell:**
```powershell
$env:DB_PATH="C:\path\to\custom\database.db"
.\start.ps1
```

**Windows Command Prompt:**
```cmd
set DB_PATH=C:\path\to\custom\database.db
start.bat
```

## Manual Start (Alternative)

If you prefer not to use the startup scripts:

```bash
# Install dependencies (first time only)
npm install

# Start both servers
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Production Build

To build and run in production mode:

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

The production server will run on http://localhost:3001 and serve both the API and the built frontend.

## Database Persistence

The game automatically saves all data to a SQLite database file at `backend/data/game.db`. This means:

- ✅ **Adventures persist** - Any adventures you create in admin mode are saved permanently
- ✅ **Game progress persists** - Your game state is saved automatically
- ✅ **Survives restarts** - All data is preserved when you stop and restart the server
- ✅ **No manual saving needed** - Everything is saved automatically after each change

The database file is created automatically on first startup. You can backup, restore, or reset it as needed (see Troubleshooting section above).

## Next Steps

Once the application is running:

1. Read the [README.md](README.md) for command reference
2. Try the demo adventure "The Lost Temple"
3. Use `sudo` (password: `admin123`) to enter admin mode
4. Create your own adventures - they'll be saved automatically!
5. Your progress is saved automatically - feel free to close and restart anytime

Enjoy your adventure! 🎮
