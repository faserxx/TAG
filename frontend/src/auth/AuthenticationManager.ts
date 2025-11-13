/**
 * Frontend authentication manager for handling sudo and admin mode
 */

import { GameMode } from '../types';
import { apiClient } from '../api/ApiClient';

export class AuthenticationManager {
  private sessionId: string | null = null;
  private currentMode: GameMode = GameMode.Player;
  private onModeChangeCallback: ((mode: GameMode) => void) | null = null;

  /**
   * Authenticate with the backend
   */
  async authenticate(password: string): Promise<boolean> {
    try {
      const data = await apiClient.post<any>('/auth/login', { password });
      
      if (data.success && data.sessionId) {
        this.sessionId = data.sessionId;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.sessionId) {
      return false;
    }

    try {
      const data = await apiClient.post<any>('/auth/validate', undefined, this.sessionId);
      return data.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Logout and destroy session
   */
  async logout(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      await apiClient.post('/auth/logout', undefined, this.sessionId);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.sessionId = null;
      this.setMode(GameMode.Player);
    }
  }

  /**
   * Elevate to admin mode
   */
  elevatePrivileges(): void {
    if (this.sessionId) {
      this.setMode(GameMode.Admin);
    }
  }

  /**
   * Drop back to player mode
   */
  dropPrivileges(): void {
    this.setMode(GameMode.Player);
  }

  /**
   * Get current mode
   */
  getCurrentMode(): GameMode {
    return this.currentMode;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionId !== null;
  }

  /**
   * Get session ID for API calls
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set current mode and notify listeners
   */
  private setMode(mode: GameMode): void {
    this.currentMode = mode;
    
    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(mode);
    }
  }

  /**
   * Register callback for mode changes
   */
  onModeChange(callback: (mode: GameMode) => void): void {
    this.onModeChangeCallback = callback;
  }
}
