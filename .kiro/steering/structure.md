# Project Structure

## Workspace Organization

```
terminal-adventure-game/
├── .kiro/                    # Kiro configuration and specs
│   ├── steering/            # AI assistant steering rules
│   └── specs/               # Feature specifications
├── frontend/                 # Frontend workspace
│   ├── src/
│   │   ├── admin/           # Administration system (create/manage adventures)
│   │   ├── api/             # API client for backend communication
│   │   ├── auth/            # Authentication manager (sudo/admin mode)
│   │   ├── engine/          # Game engine (state, locations, characters)
│   │   ├── help/            # Help system (command documentation)
│   │   ├── parser/          # Command parser (input processing)
│   │   ├── terminal/        # Terminal interface (xterm.js wrapper)
│   │   ├── styles/          # CSS styles for terminal
│   │   ├── types/           # TypeScript type definitions
│   │   └── main.ts          # Application entry point
│   ├── dist/                # Build output (gitignored)
│   ├── index.html           # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                  # Backend workspace
│   ├── data/                # Database storage (gitignored)
│   │   └── game.db          # SQLite database file (auto-created)
│   ├── src/
│   │   ├── api/             # Express server and routes
│   │   ├── auth/            # Authentication logic
│   │   ├── database/        # DataStore, schema, init, seed, persistence
│   │   ├── types/           # TypeScript type definitions
│   │   └── index.ts         # Server entry point
│   ├── dist/                # Build output (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── node_modules/            # Root dependencies
├── package.json             # Root workspace configuration
├── start.ps1                # PowerShell startup script
├── start.bat                # Windows batch startup script
├── start.sh                 # Bash startup script
├── STARTUP_GUIDE.md         # Detailed startup instructions
└── README.md                # Project documentation
```

## Code Organization Patterns

### Frontend Module Structure
Each module follows a clear separation of concerns:
- **Terminal**: UI layer (xterm.js integration, output formatting)
- **Parser**: Input processing and command routing
- **Engine**: Game logic (state management, location/character handling)
- **API**: Backend communication layer
- **Auth**: Authentication state management
- **Admin**: Adventure creation and management
- **Help**: Command documentation and help text

### Backend Module Structure
- **API**: HTTP endpoints and Express middleware
- **Database**: Data persistence (file I/O), schema definitions, seeding, DataStore
- **Auth**: Password verification and session management
- **Types**: Shared type definitions
- **Data Directory**: SQLite database file storage (backend/data/game.db)

### Naming Conventions
- Classes use PascalCase (e.g., `GameEngine`, `CommandParser`)
- Files match class names (e.g., `GameEngine.ts`)
- Test files use `.test.ts` suffix
- Interfaces and types defined in `types/index.ts`

### Import Patterns
- Relative imports within workspace (e.g., `'./terminal/TerminalInterface'`)
- Type imports from local `types` module
- External dependencies imported directly

## Key Files

- `frontend/src/main.ts`: Application initialization, event handlers, welcome message
- `backend/src/index.ts`: Server startup, database initialization with persistence
- `backend/src/database/schema.ts`: Database schema definitions
- `backend/src/database/seed.ts`: Demo adventure data
- `backend/src/database/persistence.ts`: File-based database persistence (load/save)
- `backend/data/game.db`: SQLite database file (auto-created, gitignored)
- `frontend/src/types/index.ts`: Frontend type definitions
- `backend/src/types/index.ts`: Backend type definitions (shared with frontend via API)
