/**
 * Integration tests for chat endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { APIServer } from './server.js';
import { DataStore } from '../database/DataStore.js';
import { initializeDatabase, seedDemoAdventure } from '../database/init.js';
import initSqlJs, { Database } from 'sql.js';
import { Character } from '../types/index.js';

describe('Chat API Endpoint', () => {
  let server: APIServer;
  let db: Database;
  let dataStore: DataStore;
  const TEST_PORT = 3099;
  const API_BASE = `http://localhost:${TEST_PORT}/api`;

  beforeAll(async () => {
    // Initialize in-memory database
    const SQL = await initSqlJs();
    db = new SQL.Database();
    
    // Initialize schema and seed data
    await initializeDatabase(db);
    seedDemoAdventure(db);
    
    // Create DataStore
    dataStore = new DataStore(db);
    
    // Start server
    server = new APIServer({
      port: TEST_PORT,
      dataStore,
      db
    });
    
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    db.close();
  });

  it('should return 400 when npcId is missing', async () => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello',
        conversationHistory: []
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.code).toBe('INVALID_REQUEST');
    expect(data.message).toContain('NPC ID');
  });

  it('should return 400 when message is missing', async () => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'test-npc',
        conversationHistory: []
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.code).toBe('INVALID_REQUEST');
    expect(data.message).toContain('Message');
  });

  it('should return 400 when conversationHistory is not an array', async () => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'test-npc',
        message: 'Hello',
        conversationHistory: 'not-an-array'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.code).toBe('INVALID_REQUEST');
    expect(data.message).toContain('array');
  });

  it('should return 400 when message is empty', async () => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'test-npc',
        message: '   ',
        conversationHistory: []
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.code).toBe('INVALID_REQUEST');
    expect(data.message).toContain('empty');
    expect(data.suggestion).toBeDefined();
  });

  it('should return 404 when NPC does not exist', async () => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npcId: 'non-existent-npc',
        message: 'Hello',
        conversationHistory: []
      })
    });

    expect(response.status).toBe(404);
    const data = await response.json() as any;
    expect(data.code).toBe('NPC_NOT_FOUND');
    expect(data.message).toContain('not found');
    expect(data.suggestion).toBeDefined();
  });

  it('should return 400 when NPC is not AI-powered', async () => {
    // Get the demo adventure to find a non-AI NPC
    const adventures = await dataStore.listAdventures();
    const demoAdventure = adventures.find(a => a.id === 'demo-adventure');
    
    // Find a non-AI character
    let nonAiNpc: Character | null = null;
    for (const [, location] of demoAdventure!.locations) {
      const npc = location.characters.find(c => !c.isAiPowered);
      if (npc) {
        nonAiNpc = npc;
        break;
      }
    }

    if (nonAiNpc) {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: nonAiNpc.id,
          message: 'Hello',
          conversationHistory: []
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.code).toBe('NOT_AI_POWERED');
      expect(data.message).toContain('not AI-powered');
      expect(data.suggestion).toBeDefined();
    }
  });

  it('should return 503 when LMStudio is unavailable', async () => {
    // Get the demo adventure to find an AI NPC
    const adventures = await dataStore.listAdventures();
    const demoAdventure = adventures.find(a => a.id === 'demo-adventure');
    
    // Find an AI character
    let aiNpc: Character | null = null;
    for (const [, location] of demoAdventure!.locations) {
      const npc = location.characters.find(c => c.isAiPowered);
      if (npc) {
        aiNpc = npc;
        break;
      }
    }

    if (aiNpc) {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: aiNpc.id,
          message: 'Hello',
          conversationHistory: []
        })
      });

      // Since LMStudio is likely not running in test environment, expect 503
      expect(response.status).toBe(503);
      const data = await response.json() as any;
      expect(data.code).toBe('LMSTUDIO_UNAVAILABLE');
      expect(data.message).toBeDefined();
      expect(data.suggestion).toBeDefined();
    }
  });
});
