/**
 * Main entry point for the backend application
 */

import { createDatabase, DataStore, DatabasePersistence } from './database/index.js';
import { APIServer } from './api/index.js';
import { AdventureImportExport } from './database/AdventureImportExport.js';
import { AdventureValidator } from './database/AdventureValidator.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/game.db');

async function main() {
  console.log('Terminal Adventure Game - Backend');
  console.log('Initializing database...');
  console.log(`Database path: ${DB_PATH}`);

  try {
    // Initialize persistence
    const persistence = new DatabasePersistence({
      dbPath: DB_PATH
    });

    // Create and initialize database with persistence
    const db = await createDatabase(persistence);
    const dataStore = new DataStore(db, persistence);

    console.log('Database initialized successfully');
    
    // Load demo adventure if it doesn't exist
    console.log('\nChecking for demo adventure...');
    const validator = new AdventureValidator();
    const importExport = new AdventureImportExport(dataStore, validator);
    await importExport.loadDemoAdventure();
    
    // List all adventures
    const adventures = await dataStore.listAdventures();
    console.log(`\nAvailable adventures: ${adventures.length}`);
    adventures.forEach(adv => {
      console.log(`  - ${adv.name} (${adv.id})`);
      console.log(`    Locations: ${adv.locations.size}`);
    });

    // Start API server
    console.log('\nStarting API server...');
    const server = new APIServer({
      port: PORT,
      dataStore,
      db
    });

    await server.start();
    console.log(`\nServer ready at http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  GET    /api/health');
    console.log('  GET    /api/adventures');
    console.log('  GET    /api/adventures/:id');
    console.log('  POST   /api/adventures (requires auth)');
    console.log('  PUT    /api/adventures/:id (requires auth)');
    console.log('  DELETE /api/adventures/:id (requires auth)');
    console.log('  POST   /api/adventures/import (requires auth)');
    console.log('  GET    /api/adventures/:id/export (requires auth)');
    console.log('  GET    /api/schema');
    console.log('  GET    /api/game-state');
    console.log('  POST   /api/game-state');
    console.log('  POST   /api/auth/login');
    console.log('  POST   /api/auth/logout');
    console.log('  GET    /api/auth/validate');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

main();
