# Persistent Database Storage - Design

## Architecture Overview

The solution adds file-based persistence to the existing sql.js in-memory database by:
1. Loading database from file on startup (if exists)
2. Saving database to file after write operations
3. Using a dedicated data directory for storage

## File Structure

```
backend/
├── data/                    # New directory for persistent data
│   └── game.db             # SQLite database file
├── src/
│   ├── database/
│   │   ├── DataStore.ts    # Modified: Add auto-save after writes
│   │   ├── init.ts         # Modified: Load from file if exists
│   │   └── persistence.ts  # New: File I/O operations
```

## Component Design

### 1. Database Persistence Module (`persistence.ts`)

New module responsible for file I/O operations:

```typescript
export interface PersistenceConfig {
  dbPath: string;
}

export class DatabasePersistence {
  private dbPath: string;

  constructor(config: PersistenceConfig);
  
  // Load database from file (returns null if file doesn't exist)
  async loadDatabase(): Promise<Uint8Array | null>;
  
  // Save database to file
  async saveDatabase(data: Uint8Array): Promise<void>;
  
  // Check if database file exists
  async exists(): Promise<boolean>;
  
  // Ensure data directory exists
  private async ensureDataDirectory(): Promise<void>;
}
```

**Implementation Details:**
- Use Node.js `fs/promises` for async file operations
- Create `backend/data/` directory if it doesn't exist
- Handle file read/write errors gracefully
- Default path: `backend/data/game.db`

### 2. Modified Database Initialization (`init.ts`)

Update `createDatabase()` to support loading from file:

```typescript
export async function createDatabase(
  persistence?: DatabasePersistence
): Promise<Database> {
  const SQL = await initSqlJs();
  let db: Database;

  // Try to load existing database
  if (persistence) {
    const existingData = await persistence.loadDatabase();
    if (existingData) {
      console.log('Loading existing database from file...');
      db = new SQL.Database(existingData);
      return db;
    }
  }

  // Create new database if no existing file
  console.log('Creating new database...');
  db = new SQL.Database();
  await initializeDatabase(db);
  seedDemoAdventure(db);
  await initializeAdminCredentials(db);

  // Save initial database
  if (persistence) {
    await persistence.saveDatabase(db.export());
  }

  return db;
}
```

### 3. Modified DataStore (`DataStore.ts`)

Add auto-save functionality after write operations:

```typescript
export class DataStore {
  private db: Database;
  private persistence?: DatabasePersistence;

  constructor(db: Database, persistence?: DatabasePersistence) {
    this.db = db;
    this.persistence = persistence;
  }

  // Call after any write operation
  private async persistChanges(): Promise<void> {
    if (this.persistence) {
      await this.persistence.saveDatabase(this.db.export());
    }
  }

  async saveAdventure(adventure: Adventure): Promise<void> {
    // ... existing code ...
    await this.persistChanges();
  }

  async deleteAdventure(adventureId: string): Promise<void> {
    // ... existing code ...
    await this.persistChanges();
  }

  async saveGameState(state: GameState): Promise<void> {
    // ... existing code ...
    await this.persistChanges();
  }
}
```

### 4. Modified Server Entry Point (`index.ts`)

Update to use persistence:

```typescript
import { DatabasePersistence } from './database/persistence.js';

async function main() {
  // Initialize persistence
  const persistence = new DatabasePersistence({
    dbPath: path.join(__dirname, '../data/game.db')
  });

  // Create/load database with persistence
  const db = await createDatabase(persistence);
  const dataStore = new DataStore(db, persistence);

  // ... rest of server initialization ...
}
```

## Data Flow

### Server Startup
```
1. Create DatabasePersistence instance
2. Check if database file exists
3a. If exists: Load from file → Create Database from data
3b. If not exists: Create new Database → Initialize schema → Seed demo → Save to file
4. Create DataStore with persistence
5. Start API server
```

### Write Operations
```
1. Client sends POST/PUT/DELETE request
2. DataStore performs database operation
3. DataStore calls persistChanges()
4. DatabasePersistence saves database to file
5. Response sent to client
```

## Error Handling

### File System Errors
- **Directory creation fails**: Log error and continue with in-memory only
- **File read fails**: Log warning, create new database
- **File write fails**: Log error but don't fail the request (graceful degradation)

### Database Corruption
- If loaded database is corrupted, log error and create new database
- Consider backing up corrupted file for debugging

## Performance Considerations

### Write Performance
- Each write operation triggers a file save
- sql.js `export()` is synchronous but fast for small databases
- File write is async and non-blocking
- For high-frequency writes, consider debouncing (future optimization)

### Startup Performance
- Loading from file is faster than recreating and seeding
- File I/O is async and doesn't block server startup

## Configuration

Add environment variable support:

```typescript
const DB_PATH = process.env.DB_PATH || 
  path.join(__dirname, '../data/game.db');
```

## Testing Strategy

### Unit Tests
- `DatabasePersistence`: Test file I/O operations
- `DataStore`: Verify persistChanges() is called after writes
- `init.ts`: Test database loading and creation logic

### Integration Tests
- Create adventure → Restart server → Verify adventure exists
- Save game state → Restart server → Verify state restored
- Test with missing data directory
- Test with corrupted database file

## Migration Path

1. Deploy new code with persistence enabled
2. On first startup, new database file is created
3. Existing in-memory data is lost (acceptable for initial deployment)
4. Future restarts will preserve data

## Future Enhancements

- Database backup on startup
- Periodic auto-save (in addition to per-write)
- Database versioning/migration system
- Compression for database file
- Multiple database file support (for different environments)
