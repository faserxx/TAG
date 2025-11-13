# Persistent Database Storage - Requirements

## Problem Statement

Currently, the backend uses sql.js with an in-memory database that is recreated on every server restart. While the `DataStore` class has an `export()` method, it's never called, resulting in:

- **Lost Adventures**: Any adventures created via the admin interface are lost when the server restarts
- **Lost Game State**: Player progress is not preserved across server restarts
- **Poor User Experience**: Users expect their created content and progress to persist

## Goals

1. Persist the SQLite database to disk so data survives server restarts
2. Load existing database from disk on server startup (if it exists)
3. Automatically save database changes after write operations
4. Maintain backward compatibility with existing code

## Success Criteria

- [ ] Server loads existing database file on startup (if present)
- [ ] Server creates new database file if none exists
- [ ] Adventures created via admin interface persist across server restarts
- [ ] Game state persists across server restarts
- [ ] Database file is saved after each write operation
- [ ] No breaking changes to existing API or DataStore interface

## Non-Goals

- Database migration system (can be added later if needed)
- Database backup/restore functionality
- Multi-user concurrent access handling

## Technical Constraints

- Continue using sql.js (no migration to native SQLite)
- Maintain current database schema
- Keep existing API endpoints unchanged
- Support Node.js 18+ environment

## User Stories

### As a game administrator
- I want my created adventures to persist after server restart
- I want to be able to modify adventures without losing them

### As a player
- I want my game progress to be saved across server restarts
- I want to continue from where I left off

## Open Questions

1. Where should the database file be stored? (Suggested: `backend/data/game.db`)
2. Should we add a backup mechanism for the database file?
3. How should we handle database file corruption?
