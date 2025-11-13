# Terminal Adventure Game

A terminal-based text adventure game built with xterm.js. Experience interactive storytelling through a familiar command-line interface, with support for creating custom adventures through an administration mode.

## Quick Start

```bash
# Windows PowerShell
.\start.ps1

# Windows Command Prompt
start.bat

# Linux/Mac
./start.sh
```

Then open http://localhost:3000 in your browser!

📖 See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for detailed startup instructions and troubleshooting.

## Features

- **Interactive Terminal Interface**: Built with xterm.js for an authentic terminal experience
- **Player Mode**: Navigate locations, talk to characters, and explore adventures
- **Admin Mode**: Create and manage custom adventures with sudo-like authentication
- **Persistent Database**: All adventures and game progress are automatically saved to disk
- **Demo Adventure**: Includes "The Lost Temple" demo adventure to get started

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Development

#### Quick Start (Recommended)

Use the provided startup scripts to run both frontend and backend:

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**Windows (Command Prompt):**
```cmd
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

These scripts will:
- Check and install dependencies if needed
- Start both frontend and backend servers
- Display the URLs where the application is running

#### Manual Start

Alternatively, run both frontend and backend manually:

```bash
npm run dev
```

This will start:
- Frontend dev server on http://localhost:3000
- Backend API server on http://localhost:3001

### Production Build

Build both frontend and backend:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The application will be available at http://localhost:3001

## Usage

### Player Commands

- `move <direction>` - Move to an adjacent location (north, south, east, west, up, down)
- `look` - Examine your current surroundings
- `talk <character>` - Speak with a character
- `adventures` - List all available adventures
- `load <adventure-id>` - Load and play a different adventure
- `help` - Display all available commands
- `help <command>` - Get detailed help for a specific command
- `clear` - Clear the terminal screen
- `exit` - Exit the game

### Admin Commands

First, enter admin mode:

```bash
sudo
```

Then use these commands:

- `create-adventure <name>` - Create a new adventure
- `add-location <name> <description>` - Add a location to the adventure
- `add-character <name> <dialogue...>` - Add a character to the current location
- `connect <from-id> <to-id> <direction>` - Connect two locations
- `save` - Save the current adventure
- `list-adventures` - Show all adventures
- `exit` - Return to player mode

### Default Admin Password

The default admin password is: `admin123`

**Important**: Change this in production by modifying the password hash in the database initialization.

## Architecture

- **Frontend**: TypeScript + Vite + xterm.js
- **Backend**: Node.js + Express + SQLite (sql.js with file persistence)
- **Monorepo**: Managed with npm workspaces

## Database Persistence

The game uses SQLite for data storage with automatic file persistence. All adventures, game states, and admin data are saved to disk and survive server restarts.

### Database Location

The database file is stored at:
```
backend/data/game.db
```

This file is automatically created on first startup and updated after every write operation (creating adventures, saving game state, etc.).

### Configuration

You can customize the database location using the `DB_PATH` environment variable:

```bash
# Linux/Mac
export DB_PATH=/path/to/custom/database.db
npm start

# Windows PowerShell
$env:DB_PATH="C:\path\to\custom\database.db"
npm start

# Windows Command Prompt
set DB_PATH=C:\path\to\custom\database.db
npm start
```

### How It Works

- **On Startup**: The server checks for an existing database file
  - If found: Loads the database from disk (preserving all data)
  - If not found: Creates a new database with demo adventure
- **During Operation**: Every write operation (create/update/delete) automatically saves to disk
- **Data Preserved**: Adventures, game states, admin credentials, and all game progress persist across restarts

### Database Management

**Backup Your Database:**
```bash
# Create a backup
cp backend/data/game.db backend/data/game.db.backup

# Restore from backup
cp backend/data/game.db.backup backend/data/game.db
```

**Reset to Fresh Database:**
```bash
# Delete the database file (server will create a new one on next startup)
rm backend/data/game.db        # Linux/Mac
del backend\data\game.db       # Windows
```

**View Database Contents:**
You can use any SQLite browser tool to inspect the database file, such as:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Viewer (VS Code extension)](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)

## Project Structure

```
terminal-adventure-game/
├── frontend/           # Frontend application
│   ├── src/
│   │   ├── admin/     # Administration system
│   │   ├── api/       # API client
│   │   ├── auth/      # Authentication manager
│   │   ├── engine/    # Game engine
│   │   ├── help/      # Help system
│   │   ├── parser/    # Command parser
│   │   ├── terminal/  # Terminal interface
│   │   └── main.ts    # Entry point
│   └── index.html
├── backend/            # Backend API server
│   ├── data/          # Database storage (gitignored)
│   │   └── game.db    # SQLite database file
│   └── src/
│       ├── api/       # Express server
│       ├── auth/      # Authentication
│       ├── database/  # Data store, schema, and persistence
│       └── index.ts   # Entry point
└── package.json       # Root package.json

```

## License

MIT, TypeScript, and Express.

## Project Structure

```
terminal-adventure-game/
├── frontend/          # Frontend application (Vite + TypeScript + xterm.js)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── backend/           # Backend API server (Express + TypeScript + SQLite)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── package.json       # Root workspace configuration
```

## Setup

Install dependencies:

```bash
npm install
```

## Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001
```

## Build

Build both frontend and backend:

```bash
npm run build
```

## Production

Start the production server:

```bash
npm start
```

## Technology Stack

- **Frontend**: TypeScript, Vite, xterm.js
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with sql.js
- **Authentication**: bcryptjs for password hashing
