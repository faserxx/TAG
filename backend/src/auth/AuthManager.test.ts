import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import { AuthManager } from './AuthManager';
import { initializeDatabase, initializeAdminCredentials } from '../database/init.js';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    await initializeDatabase(db);
    await initializeAdminCredentials(db);
    authManager = new AuthManager(db);
  });

  describe('session management', () => {
    it('should create a new session', () => {
      const sessionId = authManager.createSession();
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    it('should validate a valid session', () => {
      const sessionId = authManager.createSession();
      const isValid = authManager.validateSession(sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject invalid session', () => {
      const isValid = authManager.validateSession('invalid-session-id');
      expect(isValid).toBe(false);
    });

    it('should refresh a session', () => {
      const sessionId = authManager.createSession();
      const refreshed = authManager.refreshSession(sessionId);
      expect(refreshed).toBe(true);
      expect(authManager.validateSession(sessionId)).toBe(true);
    });

    it('should destroy a session', () => {
      const sessionId = authManager.createSession();
      authManager.destroySession(sessionId);
      expect(authManager.validateSession(sessionId)).toBe(false);
    });

    it('should not refresh invalid session', () => {
      const refreshed = authManager.refreshSession('invalid-session');
      expect(refreshed).toBe(false);
    });
  });

  describe('credential validation', () => {
    it('should validate correct password', async () => {
      const isValid = await authManager.validateCredentials('admin');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await authManager.validateCredentials('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('password hashing', () => {
    it('should hash password with salt', async () => {
      const { hash, salt } = await AuthManager.hashPassword('testpassword');
      expect(hash).toBeTruthy();
      expect(salt).toBeTruthy();
      expect(hash).not.toBe('testpassword');
    });

    it('should generate different hashes for same password', async () => {
      const result1 = await AuthManager.hashPassword('testpassword');
      const result2 = await AuthManager.hashPassword('testpassword');
      expect(result1.hash).not.toBe(result2.hash);
    });
  });
});
