/**
 * Database module exports
 */

export { DataStore } from './DataStore.js';
export { createDatabase, initializeDatabase, seedDemoAdventure, initializeAdminCredentials } from './init.js';
export { SCHEMA_SQL } from './schema.js';
export { DEMO_ADVENTURE } from './seed.js';
export { DatabasePersistence } from './persistence.js';
export type { PersistenceConfig } from './persistence.js';
