/**
 * Tests for API server import/export endpoints
 * Feature: adventure-import-export, Property 9: Authentication Enforcement
 * Feature: adventure-import-export, Property 10: HTTP Response Correctness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { APIServer } from './server.js';
import { DataStore } from '../database/DataStore.js';
import { SCHEMA_SQL } from '../database/schema.js';

describe('API Server - Import/Export Endpoints', () => {
  let server: APIServer;
  let db: Database;
  let dataStore: DataStore;
  let port: number;

  beforeEach(async () => {
    // Initialize SQL.js
    const SQL = await initSqlJs();
    db = new SQL.Database();
    
    // Create schema
    db.run(SCHEMA_SQL);
    
    // Initialize services
    dataStore = new DataStore(db);
    port = 3002; // Use different port for testing
    
    server = new APIServer({ port, dataStore, db });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    db.close();
  });

  /**
   * Property 9: Authentication Enforcement
   * For any import or export API endpoint request without a valid admin session,
   * the system should reject the request with a 401 status code.
   */
  describe('Property 9: Authentication Enforcement', () => {
    it('should reject import requests without authentication', async () => {
      const response = await fetch(`http://localhost:${port}/api/adventures/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'test',
          name: 'Test',
          startLocationId: 'start',
          locations: []
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject export requests without authentication', async () => {
      const response = await fetch(`http://localhost:${port}/api/adventures/test-id/export`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should allow schema endpoint without authentication', async () => {
      const response = await fetch(`http://localhost:${port}/api/schema`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.$schema).toBeDefined();
    });
  });

  /**
   * Property 10: HTTP Response Correctness
   * For any API operation, the system should return the appropriate HTTP status code
   * and response body structure.
   */
  describe('Property 10: HTTP Response Correctness', () => {
    it('should return 200 for schema endpoint', async () => {
      const response = await fetch(`http://localhost:${port}/api/schema`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return 404 for non-existent adventure export', async () => {
      // First login to get session
      const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin123' })
      });
      const loginData = await loginResponse.json();
      const sessionId = loginData.sessionId;

      // Try to export non-existent adventure
      const response = await fetch(`http://localhost:${port}/api/adventures/non-existent/export`, {
        method: 'GET',
        headers: {
          'x-session-id': sessionId
        }
      });

      expect(response.status).toBe(404);
    });
  });

  /**
   * Unit tests for API endpoints
   */
  describe('Unit Tests for API Endpoints', () => {
    it('should return schema with correct structure', async () => {
      const response = await fetch(`http://localhost:${port}/api/schema`);
      const schema = await response.json();

      expect(schema.$schema).toBeDefined();
      expect(schema.title).toBe('Adventure');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('startLocationId');
      expect(schema.required).toContain('locations');
    });

    it('should set correct headers for schema download', async () => {
      const response = await fetch(`http://localhost:${port}/api/schema`);

      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('adventure-schema.json');
    });

    it('should return 400 for invalid JSON in import', async () => {
      // First login
      const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin123' })
      });
      const loginData = await loginResponse.json();
      const sessionId = loginData.sessionId;

      // Try to import invalid adventure (missing required fields)
      const response = await fetch(`http://localhost:${port}/api/adventures/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          id: 'test'
          // Missing name, startLocationId, locations
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.errors).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
    });
  });
});
