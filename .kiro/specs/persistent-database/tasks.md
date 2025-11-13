# Persistent Database Storage - Implementation Tasks

- [x] 1. Create Database Persistence Module
  - Create `backend/src/database/persistence.ts` file
  - Define `PersistenceConfig` interface
  - Implement `DatabasePersistence` class with constructor, `loadDatabase()`, `saveDatabase()`, `exists()`, and `ensureDataDirectory()` methods
  - Add error handling for file operations
  - Export module from `database/index.ts`
  - _Acceptance: Can load/save database files, creates data directory if missing, handles errors gracefully_

- [x] 2. Update Database Initialization





  - Modify `backend/src/database/init.ts`
  - Add optional `persistence` parameter to `createDatabase()`
  - Check for existing database file before creating new one
  - Load from file if exists, otherwise create new database
  - Save initial database after creation
  - Update console logging to indicate load vs create
  - _Acceptance: Loads existing database when present, creates new when missing, backward compatible_

- [x] 3. Add Auto-Save to DataStore





  - Update `backend/src/database/DataStore.ts`
  - Add optional `persistence` parameter to constructor
  - Create private `persistChanges()` method
  - Call `persistChanges()` after `saveAdventure()`, `deleteAdventure()`, and `saveGameState()`
  - Handle persistence errors gracefully (log but don't fail)
  - _Acceptance: Database saved after each write operation, errors don't break API, backward compatible_

- [x] 4. Update Server Entry Point





  - Modify `backend/src/index.ts`
  - Import `DatabasePersistence`
  - Create persistence instance with path
  - Pass persistence to `createDatabase()` and `DataStore` constructor
  - Add environment variable support for DB path
  - Update console logging
  - _Acceptance: Server uses persistent database, path configurable via env var, logs indicate load vs create_

- [x] 5. Create Data Directory





  - Create `backend/data/` directory
  - Add `.gitkeep` file to track directory
  - Add `backend/data/*.db` to `.gitignore`
  - _Acceptance: Data directory exists in repo, database files gitignored, structure preserved_

- [x] 6. Update .gitignore





  - Add `backend/data/*.db` pattern
  - Add `backend/data/*.db-*` for backup files
  - _Acceptance: Database files not tracked by git, data directory structure preserved_

- [x] 7. Write Unit Tests





  - Create `backend/src/database/persistence.test.ts`
  - Update `backend/src/database/DataStore.test.ts`
  - Update `backend/src/database/init.test.ts`
  - Test `DatabasePersistence.loadDatabase()` with existing and missing files
  - Test `DatabasePersistence.saveDatabase()` and `ensureDataDirectory()`
  - Test `DataStore.persistChanges()` is called after writes
  - Test `createDatabase()` with and without existing file
  - _Acceptance: All new code has test coverage, tests pass consistently, edge cases covered_

- [x] 8. Integration Testing





  - Start server (should create new database)
  - Create adventure via admin interface
  - Restart server and verify adventure still exists
  - Modify adventure, restart, verify modifications persisted
  - Delete adventure, restart, verify adventure deleted
  - Save game state, restart, verify game state restored
  - _Acceptance: Adventures and game state persist across restarts, all CRUD operations work, no data loss_

- [x] 9. Update Documentation





  - Update `README.md` and `STARTUP_GUIDE.md`
  - Add section about database persistence
  - Document database file location
  - Document environment variable for DB path
  - Add troubleshooting for database issues
  - Update architecture diagram if present
  - _Acceptance: Users understand where data is stored, clear instructions for database management_

## Task Dependencies

```
Task 1 (Persistence Module)
  ↓
Task 2 (Init) + Task 3 (DataStore)
  ↓
Task 4 (Server)
  ↓
Task 5 (Data Dir) + Task 6 (.gitignore)
  ↓
Task 7 (Unit Tests) + Task 8 (Integration Tests)
  ↓
Task 9 (Documentation)
```

## Estimated Effort

- Task 1: 1-2 hours
- Task 2: 30 minutes
- Task 3: 30 minutes
- Task 4: 30 minutes
- Task 5: 5 minutes
- Task 6: 5 minutes
- Task 7: 2-3 hours
- Task 8: 1 hour
- Task 9: 30 minutes

**Total**: 6-8 hours
