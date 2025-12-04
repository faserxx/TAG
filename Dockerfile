# Multi-stage Dockerfile for Terminal Adventure Game
# Stage 1: Dependencies - Install all dependencies for both workspaces
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files for workspace setup
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies (including devDependencies for build)
# npm ci with workspaces will install dependencies in workspace directories
RUN npm ci --workspaces --include-workspace-root

# Stage 2: Build - Compile TypeScript and build frontend assets
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage (npm workspaces installs all deps in root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Copy TypeScript configs
COPY frontend/tsconfig.json ./frontend/
COPY backend/tsconfig.json ./backend/
COPY frontend/vite.config.ts ./frontend/

# Copy source code (excluding test files)
COPY frontend/src ./frontend/src
COPY frontend/index.html ./frontend/
COPY backend/src ./backend/src
COPY backend/data/demo-adventure.json ./backend/data/demo-adventure.json

# Build both workspaces
# Frontend: TypeScript compilation + Vite build
# Backend: TypeScript compilation to dist/
RUN npm run build

# Stage 3: Production - Minimal runtime image
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node || true

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=backend && \
    npm ci --omit=dev && \
    rm -rf /root/.npm

# Copy built artifacts from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create data directory for database with proper permissions
RUN mkdir -p /app/backend/data && \
    chown -R node:node /app

# Define volume mount point for database persistence
VOLUME ["/app/backend/data"]

# Switch to non-root user
USER node

# Set environment to production
ENV NODE_ENV=production

# Expose application port (internal only, not directly exposed to internet)
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
