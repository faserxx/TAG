/**
 * Quick script to check if AI NPC exists in database
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'game.db');

async function checkDatabase() {
  try {
    const SQL = await initSqlJs();
    const buffer = await fs.readFile(DB_PATH);
    const db = new SQL.Database(buffer);

    console.log('\n=== Checking AI NPC in Database ===\n');

    // Check characters table
    const result = db.exec('SELECT id, name, location_id, is_ai_powered, personality FROM characters');
    
    if (result.length > 0) {
      const data = result[0];
      console.log('Characters found:');
      for (const row of data.values) {
        const [id, name, location, isAi, personality] = row;
        console.log(`  - ${name} (${id})`);
        console.log(`    Location: ${location}`);
        console.log(`    AI Powered: ${isAi === 1 ? 'YES' : 'NO'}`);
        if (isAi === 1) {
          console.log(`    Personality: ${personality ? personality.substring(0, 50) + '...' : 'NONE'}`);
        }
        console.log('');
      }
    } else {
      console.log('No characters found in database');
    }

    db.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
