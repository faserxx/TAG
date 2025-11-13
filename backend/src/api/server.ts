/**
 * Express server setup with REST API endpoints
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataStore } from '../database/DataStore.js';
import { Adventure, GameState } from '../types/index.js';
import { AuthManager } from '../auth/AuthManager.js';
import { Database } from 'sql.js';
import { LMStudioClient, ConversationMessage } from '../ai/LMStudioClient.js';
import { lmstudioConfig } from '../config/lmstudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port: number;
  dataStore: DataStore;
  db: Database;
}

export class APIServer {
  private app: Express;
  private dataStore: DataStore;
  private authManager: AuthManager;
  private lmstudioClient: LMStudioClient;
  private port: number;
  private server: any;

  constructor(config: ServerConfig) {
    this.app = express();
    this.dataStore = config.dataStore;
    this.authManager = new AuthManager(config.db);
    this.lmstudioClient = new LMStudioClient(lmstudioConfig);
    this.port = config.port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Start session cleanup interval (every 5 minutes)
    setInterval(() => {
      this.authManager.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
    
    // Serve static files from frontend build in production
    if (process.env.NODE_ENV === 'production') {
      const frontendPath = path.join(__dirname, '../../frontend/dist');
      this.app.use(express.static(frontendPath));
    }
  }

  /**
   * Authentication middleware
   */
  private requireAuth(req: Request, res: Response, next: NextFunction): void {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      res.status(401).json({ error: 'No session ID provided' });
      return;
    }

    const isValid = this.authManager.validateSession(sessionId);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // Refresh session on valid request
    this.authManager.refreshSession(sessionId);

    next();
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Adventure endpoints (read operations are public, write operations require auth)
    this.app.get('/api/adventures', this.listAdventures.bind(this));
    this.app.get('/api/adventures/:id', this.getAdventure.bind(this));
    this.app.post('/api/adventures', this.requireAuth.bind(this), this.createAdventure.bind(this));
    this.app.put('/api/adventures/:id', this.requireAuth.bind(this), this.updateAdventure.bind(this));
    this.app.delete('/api/adventures/:id', this.requireAuth.bind(this), this.deleteAdventure.bind(this));

    // Game state endpoints
    this.app.get('/api/game-state', this.getGameState.bind(this));
    this.app.post('/api/game-state', this.saveGameState.bind(this));

    // Authentication endpoints
    this.app.post('/api/auth/login', this.login.bind(this));
    this.app.post('/api/auth/logout', this.logout.bind(this));
    this.app.get('/api/auth/validate', this.validateSession.bind(this));

    // Chat endpoint
    this.app.post('/api/chat', this.handleChat.bind(this));
  }

  /**
   * List all adventures
   */
  private async listAdventures(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adventures = await this.dataStore.listAdventures();
      
      // Convert Map to object for JSON serialization
      const serializedAdventures = adventures.map(adv => this.serializeAdventure(adv));
      
      res.json(serializedAdventures);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific adventure by ID
   */
  private async getAdventure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adventure = await this.dataStore.loadAdventure(id);
      
      res.json(this.serializeAdventure(adventure));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new adventure
   */
  private async createAdventure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adventureData = req.body;
      
      // Deserialize locations Map
      const adventure = this.deserializeAdventure(adventureData);
      
      await this.dataStore.saveAdventure(adventure);
      
      res.status(201).json(this.serializeAdventure(adventure));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing adventure
   */
  private async updateAdventure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adventureData = req.body;
      
      // Ensure the ID matches
      if (adventureData.id !== id) {
        res.status(400).json({ error: 'Adventure ID mismatch' });
        return;
      }
      
      const adventure = this.deserializeAdventure(adventureData);
      
      await this.dataStore.saveAdventure(adventure);
      
      res.json(this.serializeAdventure(adventure));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an adventure
   */
  private async deleteAdventure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.dataStore.deleteAdventure(id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current game state
   */
  private async getGameState(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameState = await this.dataStore.loadGameState();
      
      if (!gameState) {
        res.status(404).json({ error: 'No game state found' });
        return;
      }
      
      res.json(this.serializeGameState(gameState));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save game state
   */
  private async saveGameState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameStateData = req.body;
      
      const gameState = this.deserializeGameState(gameStateData);
      
      await this.dataStore.saveGameState(gameState);
      
      res.json(this.serializeGameState(gameState));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authentication endpoint
   */
  private async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      
      if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }
      
      // Validate credentials
      const isValid = await this.authManager.validateCredentials(password);
      
      if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      // Create session
      const sessionId = this.authManager.createSession();
      
      res.json({
        success: true,
        sessionId,
        message: 'Authentication successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout endpoint
   */
  private async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (sessionId) {
        this.authManager.destroySession(sessionId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate session endpoint
   */
  private async validateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        res.json({ valid: false });
        return;
      }

      const isValid = this.authManager.validateSession(sessionId);

      if (isValid) {
        // Refresh session
        this.authManager.refreshSession(sessionId);
      }

      res.json({ valid: isValid });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle chat requests with AI NPCs
   */
  private async handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { npcId, message, conversationHistory } = req.body;

      // Validate request body - return 400 for malformed requests
      if (!npcId || typeof npcId !== 'string') {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'NPC ID is required',
          suggestion: 'Provide a valid NPC ID in the request body'
        });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Message is required',
          suggestion: 'Provide a message in the request body'
        });
        return;
      }

      if (!Array.isArray(conversationHistory)) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Conversation history must be an array',
          suggestion: 'Provide conversation history as an array of messages'
        });
        return;
      }

      // Validate message is not empty
      if (message.trim().length === 0) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Message cannot be empty',
          suggestion: 'Provide a non-empty message'
        });
        return;
      }

      // Load the adventure to find the NPC
      const adventures = await this.dataStore.listAdventures();
      let npc = null;
      let npcLocation = null;

      // Search for the NPC across all adventures
      for (const adventure of adventures) {
        for (const [, location] of adventure.locations) {
          const foundNpc = location.characters.find(char => char.id === npcId);
          if (foundNpc) {
            npc = foundNpc;
            npcLocation = location;
            break;
          }
        }
        if (npc) break;
      }

      // Return 404 for invalid NPC IDs
      if (!npc) {
        res.status(404).json({
          code: 'NPC_NOT_FOUND',
          message: `NPC with ID "${npcId}" not found`,
          suggestion: 'The NPC may have been removed. Use the "look" command to see available NPCs in your current location.'
        });
        return;
      }

      // Verify NPC is AI-powered - return 400 for non-AI NPCs
      if (!npc.isAiPowered) {
        res.status(400).json({
          code: 'NOT_AI_POWERED',
          message: `NPC "${npc.name}" is not AI-powered`,
          suggestion: 'Use the "talk" command for scripted NPCs instead of "chat"'
        });
        return;
      }

      // Build location context
      const locationContext = npcLocation ? npcLocation.name : undefined;

      // Ensure LMStudio client is connected - return 503 for connection failures
      try {
        await this.lmstudioClient.connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('LMStudio connection error:', errorMessage);
        
        res.status(503).json({
          code: 'LMSTUDIO_UNAVAILABLE',
          message: 'Unable to connect to LMStudio service',
          suggestion: 'Ensure LMStudio is running on http://localhost:1234 and try again. You can start LMStudio from your applications menu.'
        });
        return;
      }

      // Generate AI response - return 408 for timeouts, 503 for other failures
      try {
        const aiResponse = await this.lmstudioClient.generateResponse({
          npc,
          message,
          conversationHistory: conversationHistory as ConversationMessage[],
          locationContext
        });

        res.json({
          success: true,
          response: aiResponse,
          npcName: npc.name
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('AI response generation error:', errorMessage);
        
        // Return 408 for request timeouts
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          res.status(408).json({
            code: 'REQUEST_TIMEOUT',
            message: 'The AI is taking too long to respond',
            suggestion: 'Please try sending your message again. If the problem persists, try a shorter or simpler message.'
          });
          return;
        }
        
        // Return 503 for LMStudio connection failures
        res.status(503).json({
          code: 'AI_GENERATION_FAILED',
          message: 'Failed to generate AI response',
          suggestion: 'Check that LMStudio is running and has a model loaded. Try restarting LMStudio if the problem persists.'
        });
      }
    } catch (error) {
      // Pass unexpected errors to global error handler
      next(error);
    }
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandling(): void {
    // In production, serve index.html for non-API routes (SPA fallback)
    if (process.env.NODE_ENV === 'production') {
      this.app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          next();
          return;
        }
        
        const frontendPath = path.join(__dirname, '../../frontend/dist/index.html');
        res.sendFile(frontendPath);
      });
    }
    
    // 404 handler for API routes
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ 
          code: 'NOT_FOUND',
          message: `Resource not found: ${req.path}`,
          suggestion: 'Check the API endpoint and try again'
        });
      } else {
        next();
      }
    });

    // Global error handler
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      
      // Check for specific error types
      if (err.message.includes('not found')) {
        res.status(404).json({ 
          code: 'NOT_FOUND',
          message: err.message,
          suggestion: 'The requested resource does not exist'
        });
      } else if (err.message.includes('Invalid') || err.message.includes('mismatch')) {
        res.status(400).json({ 
          code: 'INVALID_REQUEST',
          message: err.message,
          suggestion: 'Check your request data and try again'
        });
      } else if (err.message.includes('Authentication') || err.message.includes('Unauthorized')) {
        res.status(401).json({ 
          code: 'UNAUTHORIZED',
          message: err.message,
          suggestion: 'Please authenticate and try again'
        });
      } else {
        res.status(500).json({ 
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          suggestion: 'Please try again later or contact support'
        });
      }
    });
  }

  /**
   * Serialize Adventure for JSON response (convert Maps to objects)
   */
  private serializeAdventure(adventure: Adventure): any {
    const locations: any = {};
    
    for (const [locationId, location] of adventure.locations) {
      const exits: any = {};
      for (const [direction, targetId] of location.exits) {
        exits[direction] = targetId;
      }
      
      locations[locationId] = {
        id: location.id,
        name: location.name,
        description: location.description,
        exits,
        characters: location.characters,
        items: location.items
      };
    }
    
    return {
      id: adventure.id,
      name: adventure.name,
      description: adventure.description,
      startLocationId: adventure.startLocationId,
      locations,
      createdAt: adventure.createdAt.toISOString(),
      modifiedAt: adventure.modifiedAt.toISOString()
    };
  }

  /**
   * Deserialize Adventure from JSON request (convert objects to Maps)
   */
  private deserializeAdventure(data: any): Adventure {
    const locations = new Map();
    
    for (const [locationId, locationData] of Object.entries(data.locations || {})) {
      const location: any = locationData;
      const exits = new Map(Object.entries(location.exits || {}));
      
      locations.set(locationId, {
        id: location.id,
        name: location.name,
        description: location.description,
        exits,
        characters: location.characters || [],
        items: location.items || []
      });
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      startLocationId: data.startLocationId,
      locations,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : new Date()
    };
  }

  /**
   * Serialize GameState for JSON response
   */
  private serializeGameState(gameState: GameState): any {
    return {
      currentLocation: gameState.currentLocation,
      visitedLocations: Array.from(gameState.visitedLocations),
      inventory: gameState.inventory,
      flags: Object.fromEntries(gameState.flags),
      mode: gameState.mode
    };
  }

  /**
   * Deserialize GameState from JSON request
   */
  private deserializeGameState(data: any): GameState {
    return {
      currentLocation: data.currentLocation,
      visitedLocations: new Set(data.visitedLocations || []),
      inventory: data.inventory || [],
      flags: new Map(Object.entries(data.flags || {})),
      mode: data.mode
    };
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`API server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log('API server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
