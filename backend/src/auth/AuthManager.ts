/**
 * Authentication manager for admin access
 */

import bcrypt from 'bcryptjs';
import { Database } from 'sql.js';

export interface Session {
  id: string;
  authenticated: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export class AuthManager {
  private db: Database;
  private sessions: Map<string, Session>;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  constructor(db: Database) {
    this.db = db;
    this.sessions = new Map();
  }

  /**
   * Validate admin credentials
   */
  async validateCredentials(password: string): Promise<boolean> {
    try {
      // Retrieve stored credentials
      const result = this.db.exec('SELECT password_hash FROM admin_credentials WHERE id = 1');

      if (result.length === 0 || result[0].values.length === 0) {
        console.error('No admin credentials found in database');
        return false;
      }

      const passwordHash = result[0].values[0][0] as string;

      // Compare password with stored hash
      const isValid = await bcrypt.compare(password, passwordHash);

      return isValid;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }

  /**
   * Create a new session
   */
  createSession(): string {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const session: Session = {
      id: sessionId,
      authenticated: true,
      createdAt: now,
      expiresAt
    };

    this.sessions.set(sessionId, session);

    return sessionId;
  }

  /**
   * Validate a session
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    return session.authenticated;
  }

  /**
   * Refresh a session (extend expiration)
   */
  refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session || !this.validateSession(sessionId)) {
      return false;
    }

    // Extend expiration
    session.expiresAt = new Date(Date.now() + this.sessionTimeout);
    this.sessions.set(sessionId, session);

    return true;
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Generate a random session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Hash a password (utility for creating/updating credentials)
   */
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    return { hash, salt };
  }

  /**
   * Update admin password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { hash, salt } = await AuthManager.hashPassword(newPassword);

      this.db.run(
        'UPDATE admin_credentials SET password_hash = ?, salt = ? WHERE id = 1',
        [hash, salt]
      );

      console.log('Admin password updated successfully');
    } catch (error) {
      throw new Error(`Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
