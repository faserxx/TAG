# Design Document

## Overview

This design document outlines the Docker containerization strategy for the Terminal Adventure Game. The solution uses a multi-stage Docker build to create an optimized production image that includes both the frontend (built with Vite) and backend (Node.js/Express) components. The design emphasizes security, efficiency, and ease of deployment while supporting configuration through environment variables.

## Architecture

### Container Architecture

The application will be deployed as a multi-container system using Docker Compose:

**Application Container (app)**
- Serves the built frontend static files through the Express backend
- Provides REST API endpoints for game state management
- Maintains SQLite database persistence through volume mounting
- Supports configuration via environment variables
- Not directly exposed to the internet

**Nginx Reverse Proxy Container (nginx)**
- Acts as the entry point for all HTTP traffic
- Forwards requests to the application container
- Serves static files efficiently
- Implements security headers and rate limiting
- Only container exposed to external network

**ModSecurity WAF Container (modsecurity)**
- Integrated with nginx as a module
- Implements OWASP Core Rule Set (CRS)
- Blocks common web attacks (SQL injection, XSS, etc.)
- Logs security events

**Fail2ban Container (fail2ban)**
- Monitors nginx and application logs
- Detects repeated failed authentication attempts
- Automatically bans offending IP addresses via iptables
- Configurable ban duration and retry thresholds

### Network Architecture

```
Internet → nginx:80 → modsecurity → app:3001
                ↓
           fail2ban (monitors logs)
```

All containers communicate via a private Docker network. Only nginx port 80 is exposed to the host.

### Multi-Stage Build Strategy

**Application Dockerfile** (./Dockerfile)

Three-stage build process:

**Stage 1: Dependencies**
- Base: Node.js 18 Alpine image
- Purpose: Install all dependencies for both workspaces
- Output: node_modules for frontend and backend

**Stage 2: Build**
- Base: Inherits from Stage 1
- Purpose: Compile TypeScript and build frontend assets
- Output: Compiled backend (dist/) and frontend (dist/) artifacts

**Stage 3: Production**
- Base: Fresh Node.js 18 Alpine image
- Purpose: Create minimal runtime image
- Contents: Only production dependencies and built artifacts
- User: Non-root user for security

**Nginx Dockerfile** (./nginx/Dockerfile)

Single-stage build:
- Base: nginx:alpine with ModSecurity module
- Purpose: Reverse proxy with WAF capabilities
- Contents: nginx configuration, ModSecurity rules, SSL certificates (if needed)

**Fail2ban Dockerfile** (./fail2ban/Dockerfile)

Single-stage build:
- Base: Alpine Linux with fail2ban
- Purpose: Intrusion prevention
- Contents: fail2ban configuration, jail rules, log monitoring setup

## Components and Interfaces

### Application Dockerfile

Location: `./Dockerfile` (project root)

Key sections:
- **FROM node:18-alpine AS deps**: Dependency installation stage
- **FROM deps AS builder**: Build stage for compilation
- **FROM node:18-alpine AS production**: Final production image
- **VOLUME ["/app/backend/data"]**: Database persistence
- **EXPOSE 3001**: HTTP port (internal only)
- **HEALTHCHECK**: Container health monitoring
- **USER node**: Non-root execution

### Nginx Configuration

Location: `./nginx/nginx.conf`

Key features:
- Reverse proxy to app:3001
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting (limit_req_zone)
- Access and error logging
- ModSecurity integration
- Client body size limits

Location: `./nginx/Dockerfile`

Based on: `owasp/modsecurity-crs:nginx-alpine`

### ModSecurity Configuration

Location: `./nginx/modsecurity/modsecurity.conf`

Key features:
- OWASP Core Rule Set v4.x
- Request body inspection
- Response body inspection
- Anomaly scoring mode
- Custom rule exclusions for false positives

Location: `./nginx/modsecurity/crs-setup.conf`

Configures CRS paranoia level and thresholds

### Fail2ban Configuration

Location: `./fail2ban/jail.local`

Jails:
- **nginx-auth**: Monitors nginx access logs for 401/403 responses
- **app-auth**: Monitors application logs for failed authentication
- **nginx-limit-req**: Monitors rate limit violations

Ban settings:
- Ban time: 1 hour (configurable)
- Find time: 10 minutes
- Max retry: 5 attempts

Location: `./fail2ban/Dockerfile`

Based on: `alpine:latest` with fail2ban package

### Docker Compose Configuration

Location: `./docker-compose.yml`

Services:
- **app**: Application container
- **nginx**: Reverse proxy with ModSecurity
- **fail2ban**: Intrusion prevention

Networks:
- **frontend**: nginx to internet
- **backend**: nginx to app (internal)

Volumes:
- **game-data**: Database persistence
- **nginx-logs**: Shared logs for fail2ban
- **fail2ban-data**: Fail2ban state persistence

### Build Script

Location: `./build-docker.sh` (cross-platform shell script)

Responsibilities:
- Parse command-line arguments (version tag, architecture)
- Execute docker compose build with appropriate flags
- Tag images with version and latest
- Display build progress and errors
- Support multi-architecture builds (optional)

Interface:
```bash
./build-docker.sh [VERSION] [OPTIONS]
  VERSION: Image tag (default: latest)
  OPTIONS:
    --platform: Target platform (e.g., linux/amd64,linux/arm64)
```

### Environment Configuration

The application will read configuration from environment variables:

**Application Container:**

| Variable | Purpose | Default |
|----------|---------|---------|
| PORT | HTTP server port | 3001 |
| LMSTUDIO_BASE_URL | LM Studio endpoint | http://192.168.0.18:1234 |
| LMSTUDIO_MODEL | AI model name | default |
| LMSTUDIO_TIMEOUT | AI request timeout (ms) | 30000 |
| LMSTUDIO_TEMPERATURE | AI temperature | 0.8 |
| LMSTUDIO_MAX_TOKENS | AI max tokens | 150 |
| ADMIN_PASSWORD | Admin authentication | admin123 |
| ROOT_PASSWORD | Root user game password | root123 |

**Nginx Container:**

| Variable | Purpose | Default |
|----------|---------|---------|
| NGINX_PORT | External HTTP port | 80 |
| RATE_LIMIT | Requests per second | 10r/s |
| CLIENT_MAX_BODY_SIZE | Max upload size | 10M |

**Fail2ban Container:**

| Variable | Purpose | Default |
|----------|---------|---------|
| FAIL2BAN_BANTIME | Ban duration (seconds) | 3600 |
| FAIL2BAN_FINDTIME | Time window (seconds) | 600 |
| FAIL2BAN_MAXRETRY | Max attempts | 5 |

## Data Models

### Docker Image Metadata

```typescript
interface DockerImage {
  name: string;           // "terminal-adventure-game"
  tag: string;            // Version or "latest"
  size: number;           // Image size in bytes
  created: Date;          // Build timestamp
  platform: string;       // "linux/amd64" or "linux/arm64"
}
```

### Volume Mount Configuration

```typescript
interface VolumeMount {
  hostPath: string;       // Path on host system
  containerPath: string;  // "/app/backend/data"
  mode: "rw" | "ro";     // Read-write or read-only
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidation opportunities:

**Redundant Properties:**
- Requirements 2.2 and 6.2 both test PORT configuration - can be combined
- Requirements 2.5, 6.1, 6.3, and 6.4 all test environment variable configuration - can be combined into one comprehensive property
- Requirements 5.1 and 5.3 both verify volume definition - redundant

**Consolidated Properties:**
- Environment variable configuration (2.5, 6.1, 6.3, 6.4) → Single property testing all environment variables
- Port configuration (2.2, 6.2) → Covered by the environment variable property

**New Properties for Security Requirements:**
- WAF blocking (7.3) → Property testing malicious request blocking
- Fail2ban IP banning (8.2) → Property testing brute force protection
- Rate limiting (8.4) → Property testing request throttling

### Correctness Properties

Property 1: Environment variable configuration
*For any* valid environment variable (PORT, LMSTUDIO_BASE_URL, LMSTUDIO_MODEL, LMSTUDIO_TIMEOUT, LMSTUDIO_TEMPERATURE, LMSTUDIO_MAX_TOKENS, ADMIN_PASSWORD, ROOT_PASSWORD), when the container is started with that variable set to a valid value, the running application should use that configured value instead of the default.
**Validates: Requirements 2.5, 6.1, 6.3, 6.4**

Property 2: Port binding
*For any* valid port number provided via the PORT environment variable, the container should listen on that port and respond to HTTP requests.
**Validates: Requirements 2.2, 6.2**

Property 3: WAF malicious request blocking
*For any* request matching OWASP CRS attack patterns (SQL injection, XSS, path traversal, etc.), the WAF should block the request and return a 403 status code before it reaches the application.
**Validates: Requirements 7.3**

Property 4: Fail2ban brute force protection
*For any* IP address that exceeds the maximum retry threshold for failed authentication attempts within the find time window, fail2ban should ban that IP address for the configured ban duration.
**Validates: Requirements 8.2**

Property 5: Rate limiting
*For any* client exceeding the configured rate limit (requests per second), nginx should return a 429 status code and reject subsequent requests until the rate drops below the threshold.
**Validates: Requirements 8.4**

## Error Handling

### Build Failures

**Dependency Installation Errors**
- Cause: Network issues, invalid package versions
- Handling: Build script exits with non-zero code, displays npm error output
- Recovery: User retries build or checks network connectivity

**Compilation Errors**
- Cause: TypeScript errors, missing files
- Handling: Build fails at compilation stage, displays tsc errors
- Recovery: Fix source code errors before rebuilding

**Docker Build Errors**
- Cause: Invalid Dockerfile syntax, missing base images
- Handling: Docker build fails with descriptive error
- Recovery: Fix Dockerfile or pull required base images

### Runtime Errors

**Port Already in Use**
- Cause: Another process using the configured port
- Handling: Express server fails to start, logs error
- Recovery: Stop conflicting process or use different PORT value

**Volume Mount Permission Errors**
- Cause: Insufficient permissions on host directory
- Handling: Container fails to write to database
- Recovery: Fix host directory permissions or run with appropriate user mapping

**Missing Environment Variables**
- Cause: Required configuration not provided
- Handling: Application uses default values
- Recovery: Provide environment variables if defaults are incorrect

**Database Initialization Failures**
- Cause: Corrupted database file, insufficient disk space
- Handling: Application logs error and exits
- Recovery: Remove corrupted database or free disk space

## Testing Strategy

### Unit Testing

The Docker deployment will be validated through a combination of unit tests and property-based tests:

**Build Script Tests:**
- Test argument parsing with various inputs
- Test default tag behavior when no version specified
- Test error handling for invalid arguments
- Test output formatting and progress display

**Dockerfile Validation:**
- Verify multi-stage build structure
- Check for security best practices (non-root user, minimal base image)
- Validate EXPOSE and VOLUME directives
- Verify HEALTHCHECK configuration

**Integration Tests:**
- Build image and verify it exists
- Start container and verify application responds
- Test volume persistence across container restarts
- Verify environment variable configuration
- Test health check endpoint

### Property-Based Testing

We will use **fast-check** (already available in backend devDependencies) for property-based testing.

**Configuration Requirements:**
- Each property-based test MUST run a minimum of 100 iterations
- Each test MUST be tagged with: `**Feature: docker-deployment, Property {number}: {property_text}**`
- Each correctness property MUST be implemented by a SINGLE property-based test

**Property Test 1: Environment Variable Configuration**
- Generate random valid values for each environment variable
- Start container with those values
- Verify application uses the configured values
- Tag: `**Feature: docker-deployment, Property 1: Environment variable configuration**`

**Property Test 2: Port Binding**
- Generate random valid port numbers (1024-65535)
- Start container with PORT environment variable
- Verify container listens on specified port
- Tag: `**Feature: docker-deployment, Property 2: Port binding**`

**Property Test 3: WAF Malicious Request Blocking**
- Generate random malicious payloads (SQL injection, XSS, path traversal)
- Send requests through nginx to application
- Verify all malicious requests are blocked with 403 status
- Tag: `**Feature: docker-deployment, Property 3: WAF malicious request blocking**`

**Property Test 4: Fail2ban Brute Force Protection**
- Generate random IP addresses
- Simulate failed authentication attempts exceeding threshold
- Verify IP is banned and subsequent requests are blocked
- Tag: `**Feature: docker-deployment, Property 4: Fail2ban brute force protection**`

**Property Test 5: Rate Limiting**
- Generate random request rates above and below threshold
- Send requests at various rates
- Verify requests above limit receive 429 status
- Tag: `**Feature: docker-deployment, Property 5: Rate limiting**`

### Example-Based Tests

These tests verify specific scenarios and edge cases:

**Test: Build creates image with correct tag**
- Run build script with version "1.0.0"
- Verify image "terminal-adventure-game:1.0.0" exists
- Validates: Requirements 1.1, 1.4

**Test: Image contains required files**
- Build image
- Inspect image filesystem
- Verify presence of: dist/, node_modules/, package.json
- Validates: Requirements 1.3

**Test: Database initialization on first start**
- Start container without mounted volume
- Verify database file is created
- Validates: Requirements 2.1

**Test: Data persistence with volume**
- Start container with volume mount
- Create game data
- Stop container
- Start new container with same volume
- Verify data persists
- Validates: Requirements 2.3, 5.2

**Test: Default port exposure**
- Inspect image metadata
- Verify port 3001 is exposed
- Validates: Requirements 2.4

**Test: Build script default tag**
- Run build script without arguments
- Verify image tagged as "latest"
- Validates: Requirements 3.2

**Test: Build script error handling**
- Intentionally cause build failure
- Verify non-zero exit code
- Verify error message displayed
- Validates: Requirements 3.4

**Test: Non-root user execution**
- Start container
- Check process user
- Verify not running as root
- Validates: Requirements 4.1

**Test: Production dependencies only**
- Inspect final image
- Verify devDependencies not present
- Validates: Requirements 4.3

**Test: Health check configured**
- Inspect image metadata
- Verify HEALTHCHECK directive present
- Validates: Requirements 4.5

**Test: Volume mount point defined**
- Inspect image metadata
- Verify VOLUME directive for /app/backend/data
- Validates: Requirements 5.1, 5.3

**Test: Ephemeral database without volume**
- Start container without volume mount
- Create data
- Stop and remove container
- Start new container
- Verify data does not persist
- Validates: Requirements 5.4

**Test: Default configuration values**
- Start container without environment variables
- Verify application uses default values
- Validates: Requirements 6.6

**Test: Nginx reverse proxy**
- Start full stack with docker-compose
- Send request to nginx port
- Verify request is forwarded to application
- Validates: Requirements 7.1

**Test: ModSecurity WAF integration**
- Inspect nginx container
- Verify ModSecurity module is loaded
- Verify OWASP CRS rules are active
- Validates: Requirements 7.2

**Test: Nginx is only exposed service**
- Inspect docker-compose network configuration
- Verify only nginx port is published to host
- Verify app port is not directly accessible
- Validates: Requirements 7.4

**Test: Security event logging**
- Trigger WAF block
- Verify event is logged
- Verify fail2ban can read logs
- Validates: Requirements 7.5

**Test: Fail2ban configuration**
- Inspect fail2ban container
- Verify jails are configured
- Verify log paths are correct
- Validates: Requirements 8.1

**Test: Security headers**
- Send request through nginx
- Verify response includes security headers
- Check for X-Frame-Options, X-Content-Type-Options, etc.
- Validates: Requirements 8.3

**Test: Authentication logging**
- Perform authentication attempt
- Verify attempt is logged
- Verify log format is parseable by fail2ban
- Validates: Requirements 8.5

## Implementation Notes

### Dockerfile Optimization

**Layer Ordering:**
1. Copy package files first (changes infrequently)
2. Install dependencies (cached unless package files change)
3. Copy source code (changes frequently)
4. Build application

**Size Optimization:**
- Use Alpine-based Node.js images (~50MB vs ~900MB for full image)
- Multi-stage build to exclude build tools from final image
- Only copy production node_modules to final stage
- Use .dockerignore to exclude unnecessary files

### Build Script Implementation

The build script will be implemented as a shell script for cross-platform compatibility:

```bash
#!/bin/bash
VERSION=${1:-latest}
docker build -t terminal-adventure-game:${VERSION} .
docker tag terminal-adventure-game:${VERSION} terminal-adventure-game:latest
```

For Windows users, a PowerShell version will also be provided:

```powershell
param([string]$Version = "latest")
docker build -t terminal-adventure-game:$Version .
docker tag terminal-adventure-game:$Version terminal-adventure-game:latest
```

### Health Check Implementation

The health check will verify the Express server is responding:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

This requires adding a `/health` endpoint to the Express server.

### Volume Mounting Best Practices

**Development:**
```bash
docker run -v $(pwd)/backend/data:/app/backend/data -p 3001:3001 terminal-adventure-game
```

**Production:**
```bash
docker run -v /var/lib/adventure-game:/app/backend/data -p 3001:3001 terminal-adventure-game
```

## Security Considerations

### Application Security

1. **Non-root User**: Application runs as the `node` user (UID 1000) to limit potential damage from container escape vulnerabilities

2. **Minimal Base Image**: Alpine Linux reduces attack surface by including only essential packages

3. **No Secrets in Image**: All sensitive configuration (passwords, API endpoints) provided via environment variables, never baked into the image

4. **Read-only Root Filesystem**: Consider running with `--read-only` flag and explicit tmpfs mounts for writable directories

5. **Resource Limits**: Recommend setting memory and CPU limits in production deployments

### Network Security

1. **Reverse Proxy Isolation**: Application container is not directly exposed; all traffic goes through nginx

2. **Internal Network**: Backend network is marked as internal, preventing direct internet access from app container

3. **Port Exposure**: Only nginx port 80 is exposed to the host; application port 3001 is internal only

### Web Application Firewall

1. **OWASP Core Rule Set**: Implements industry-standard rules for detecting common attacks

2. **Anomaly Scoring**: Uses scoring mode to reduce false positives while maintaining security

3. **Request/Response Inspection**: Examines both incoming requests and outgoing responses

4. **Custom Rule Exclusions**: Allows tuning for application-specific false positives

### Intrusion Prevention

1. **Fail2ban Monitoring**: Actively monitors logs for attack patterns

2. **Automatic IP Banning**: Blocks offending IPs at the network level using iptables

3. **Configurable Thresholds**: Ban time, find time, and max retry are all configurable

4. **Persistent State**: Ban state survives container restarts via volume mounting

### Additional Hardening

1. **Security Headers**: nginx adds headers to prevent clickjacking, MIME sniffing, XSS

2. **Rate Limiting**: Prevents abuse and DoS attacks by limiting requests per IP

3. **Client Body Size Limits**: Prevents large upload attacks

4. **Access Logging**: All requests logged for security auditing and forensics

5. **Fail2ban Whitelisting**: Support for whitelisting trusted IPs to prevent accidental lockout

## Deployment Scenarios

### Docker Compose Deployment (Recommended)

Production-ready deployment with full security stack:

```yaml
version: '3.8'

services:
  app:
    build: .
    image: terminal-adventure-game:latest
    container_name: adventure-game-app
    volumes:
      - game-data:/app/backend/data
      - nginx-logs:/var/log/app
    environment:
      - PORT=3001
      - LMSTUDIO_BASE_URL=${LMSTUDIO_BASE_URL:-http://192.168.0.18:1234}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
      - ROOT_PASSWORD=${ROOT_PASSWORD:-root123}
    networks:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3

  nginx:
    build: ./nginx
    image: adventure-game-nginx:latest
    container_name: adventure-game-nginx
    ports:
      - "80:80"
    volumes:
      - nginx-logs:/var/log/nginx
    environment:
      - RATE_LIMIT=${RATE_LIMIT:-10r/s}
      - CLIENT_MAX_BODY_SIZE=${CLIENT_MAX_BODY_SIZE:-10M}
    networks:
      - frontend
      - backend
    depends_on:
      - app
    restart: unless-stopped

  fail2ban:
    build: ./fail2ban
    image: adventure-game-fail2ban:latest
    container_name: adventure-game-fail2ban
    volumes:
      - nginx-logs:/var/log/nginx:ro
      - fail2ban-data:/var/lib/fail2ban
    environment:
      - FAIL2BAN_BANTIME=${FAIL2BAN_BANTIME:-3600}
      - FAIL2BAN_FINDTIME=${FAIL2BAN_FINDTIME:-600}
      - FAIL2BAN_MAXRETRY=${FAIL2BAN_MAXRETRY:-5}
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    restart: unless-stopped

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

volumes:
  game-data:
  nginx-logs:
  fail2ban-data:
```

### Development Deployment (Without Security)

For local development without security overhead:

```bash
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/backend/data:/app/backend/data \
  -e LMSTUDIO_BASE_URL=http://host.docker.internal:1234 \
  --name adventure-game-dev \
  terminal-adventure-game:latest
```

### Kubernetes Deployment

For production-scale deployments with orchestration:

**Deployment:**
- Use Deployment for replica management (app and nginx)
- Use DaemonSet for fail2ban (one per node)

**Configuration:**
- ConfigMap for nginx configuration and ModSecurity rules
- Secret for ADMIN_PASSWORD and ROOT_PASSWORD
- PersistentVolumeClaim for database storage

**Networking:**
- Service (ClusterIP) for app backend
- Service (LoadBalancer) for nginx frontend
- NetworkPolicy to restrict app to nginx-only access

**Security:**
- PodSecurityPolicy for non-root enforcement
- SecurityContext for capability restrictions
- RBAC for fail2ban iptables access

## Documentation Requirements

The following documentation will be added to the project README:

### Docker Build Section
- Prerequisites (Docker and Docker Compose installed)
- Build command with version tagging
- Build script usage
- Multi-architecture build instructions
- Building individual containers vs full stack

### Docker Compose Deployment Section
- Quick start with docker-compose up
- Environment variable configuration via .env file
- Volume mounting for data persistence
- Accessing the application (http://localhost)
- Stopping and restarting the stack
- Viewing logs from all containers

### Environment Variables Section
- Complete list of supported variables (app, nginx, fail2ban)
- Default values for each variable
- Example .env file
- LM Studio integration setup
- Security configuration (passwords, rate limits)

### Security Section
- Overview of security architecture
- ModSecurity WAF configuration
- Fail2ban tuning and whitelisting
- Viewing security logs
- Checking banned IPs
- Manually unbanning IPs
- Security best practices

### Troubleshooting Section
- Port conflicts (port 80 already in use)
- Permission errors (volume mounts, fail2ban iptables)
- Database issues
- Network connectivity problems
- Container logs access (docker-compose logs)
- WAF false positives (tuning ModSecurity)
- Fail2ban not banning (log format issues)
- Application not accessible through nginx
- Health check failures
