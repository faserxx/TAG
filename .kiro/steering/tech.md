# Technology Stack

## Architecture

Monorepo managed with npm workspaces containing separate frontend and backend applications.

## Frontend

- **Runtime**: Browser-based
- **Build Tool**: Vite 5.x
- **Language**: TypeScript 5.3+ (strict mode enabled)
- **UI Library**: xterm.js (@xterm/xterm) with fit addon
- **Module System**: ESNext with bundler resolution

### TypeScript Configuration
- Target: ES2020
- Strict mode with noUnusedLocals and noUnusedParameters
- No emit (handled by Vite)

## Backend

- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Language**: TypeScript 5.3+ (strict mode enabled)
- **Database**: SQLite via sql.js (in-memory with persistence)
- **Authentication**: bcryptjs for password hashing
- **Module System**: ESNext with Node resolution
- **Dev Server**: tsx with watch mode

### TypeScript Configuration
- Target: ES2020
- Compiles to `dist/` directory
- Generates declaration files and source maps
- Strict mode with noUnusedLocals and noUnusedParameters

## Testing

- **Framework**: Vitest 4.x
- **UI**: @vitest/ui available for both workspaces
- **Command**: `npm run test` (runs with --run flag, not watch mode)

## Common Commands

### Development
```bash
# Start both frontend and backend (recommended)
npm run dev

# Or use platform-specific scripts
.\start.ps1        # Windows PowerShell
start.bat          # Windows Command Prompt
./start.sh         # Linux/Mac

# Start individually
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001
```

### Building
```bash
# Build both workspaces
npm run build

# Build individually
npm run build:frontend
npm run build:backend
```

### Production
```bash
npm start  # Runs backend on http://localhost:3001 (serves frontend build)
```

### Testing
```bash
# Run tests in both workspaces
npm run test --workspaces

# Run tests in specific workspace
npm run test --workspace=frontend
npm run test --workspace=backend
```

## Dependencies

### Frontend Core
- @xterm/xterm, @xterm/addon-fit

### Backend Core
- express, cors, sql.js, bcryptjs

### Development
- concurrently (root level for parallel dev servers)
- tsx (backend dev server)
- vite (frontend bundler)
