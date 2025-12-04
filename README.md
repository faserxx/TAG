# Terminal Adventure Game

A terminal-based text adventure game built with xterm.js. Experience interactive storytelling through a familiar command-line interface, with support for creating custom adventures through an administration mode.
This project is 100% created with AI, Kiro specifically, and it was created for the hackaton Kiroween at DevPost (https://devpost.com/software/tag-terminal-adventure-game-on-steroids)

## Quick Start

```bash
# Windows PowerShell
.\start.ps1

# Windows Command Prompt
start.bat

# Linux/Mac
./start.sh
```

Then open http://localhost:3000 in your browser!

📖 See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for detailed startup instructions and troubleshooting.

## Features

- **Interactive Terminal Interface**: Built with xterm.js for an authentic terminal experience
- **Player Mode**: Navigate locations, talk to characters, and explore adventures
- **Admin Mode**: Create and manage custom adventures with sudo-like authentication
- **Persistent Database**: All adventures and game progress are automatically saved to disk
- **Demo Adventure**: Includes "The Lost Temple" demo adventure to get started

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Development

#### Quick Start (Recommended)

Use the provided startup scripts to run both frontend and backend:

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**Windows (Command Prompt):**
```cmd
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

These scripts will:
- Check and install dependencies if needed
- Start both frontend and backend servers
- Display the URLs where the application is running

#### Manual Start

Alternatively, run both frontend and backend manually:

```bash
npm run dev
```

This will start:
- Frontend dev server on http://localhost:3000
- Backend API server on http://localhost:3001

### Production Build

Build both frontend and backend:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The application will be available at http://localhost:3001

## Docker Deployment

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+

### Docker Build

#### Building Images

Build all Docker images using the provided build scripts:

**Linux/Mac:**
```bash
./build-docker.sh
```

**Windows (PowerShell):**
```powershell
.\build-docker.ps1
```

**With version tag:**
```bash
./build-docker.sh 1.0.0
```

**Multi-architecture build:**
```bash
./build-docker.sh 1.0.0 --platform linux/amd64,linux/arm64
```

The build script will create three Docker images:
- `terminal-adventure-game` - Application container (frontend + backend)
- `adventure-game-nginx` - Nginx reverse proxy with ModSecurity WAF
- `adventure-game-fail2ban` - Fail2ban intrusion prevention

#### Exporting Images for Transfer

To export images for deployment on another Docker host:

**Linux/Mac:**
```bash
./export-docker-images.sh
```

**Windows (PowerShell):**
```powershell
.\export-docker-images.ps1
```

This creates a `.tar` file containing all three images. The file will be named with a timestamp (e.g., `terminal-adventure-game-20231204_153045.tar`).

**Transfer and import on remote host:**

1. **Transfer the tar file:**
```bash
scp terminal-adventure-game-*.tar user@remote-host:/path/to/destination/
```

2. **Import images on remote host:**
```bash
docker load -i terminal-adventure-game-*.tar
```

3. **Copy configuration files to remote host:**
```bash
# Use docker-compose.prod.yml for pre-built images (no source code needed)
scp docker-compose.prod.yml .env user@remote-host:/path/to/app/
```

4. **Start services on remote host:**
```bash
cd /path/to/app
docker compose -f docker-compose.prod.yml up -d
```

**Note:** Use `docker-compose.prod.yml` on remote hosts where you've imported pre-built images. The regular `docker-compose.yml` is for building from source.

**Alternative: Export individual images**

If you need to export images separately:
```bash
# Export individual images
docker save -o app.tar terminal-adventure-game:latest
docker save -o nginx.tar adventure-game-nginx:latest
docker save -o fail2ban.tar adventure-game-fail2ban:latest

# Import on remote host
docker load -i app.tar
docker load -i nginx.tar
docker load -i fail2ban.tar
```

### Docker Compose Deployment

#### Quick Start

1. **Copy the environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` and configure your settings:**
```bash
# Change the admin password (IMPORTANT!)
ADMIN_PASSWORD=your-secure-password

# Configure LM Studio endpoint if using AI NPCs
LMSTUDIO_BASE_URL=http://host.docker.internal:1234

# Adjust security settings as needed
FAIL2BAN_BANTIME=3600
RATE_LIMIT=10r/s
```

3. **Start the application:**
```bash
docker compose up -d
```

4. **Access the application:**
Open http://localhost:8888 in your browser

#### Environment Variables

**Application Configuration:**
- `PORT` - HTTP server port (default: 3001)
- `ADMIN_PASSWORD` - Admin password for sudo command (default: admin123)

**LM Studio AI Configuration:**
- `LMSTUDIO_BASE_URL` - LM Studio API endpoint (default: http://192.168.0.18:1234)
- `LMSTUDIO_MODEL` - AI model name (default: default)
- `LMSTUDIO_TIMEOUT` - Request timeout in ms (default: 30000)
- `LMSTUDIO_TEMPERATURE` - AI temperature 0.0-1.0 (default: 0.8)
- `LMSTUDIO_MAX_TOKENS` - Max tokens in response (default: 150)

**Nginx Configuration:**
- `NGINX_PORT` - External HTTP port (default: 80)
- `RATE_LIMIT` - Requests per second per IP (default: 10r/s)
- `CLIENT_MAX_BODY_SIZE` - Max upload size (default: 10M)

**Fail2ban Configuration:**
- `FAIL2BAN_BANTIME` - Ban duration in seconds (default: 3600)
- `FAIL2BAN_FINDTIME` - Time window for counting attempts (default: 600)
- `FAIL2BAN_MAXRETRY` - Max failed attempts before ban (default: 5)

See `.env.example` for detailed documentation and examples.

#### Volume Mounting

Game data is persisted in Docker volumes:
- `game-data` - Database and game state
- `nginx-logs` - Nginx access and error logs
- `fail2ban-data` - Fail2ban ban state

**Backup game data:**
```bash
docker run --rm -v game-data:/data -v $(pwd):/backup alpine tar czf /backup/game-data-backup.tar.gz -C /data .
```

**Restore game data:**
```bash
docker run --rm -v game-data:/data -v $(pwd):/backup alpine tar xzf /backup/game-data-backup.tar.gz -C /data
```

#### Managing the Stack

**View logs:**
```bash
docker compose logs -f              # All services
docker compose logs -f app          # Application only
docker compose logs -f nginx        # Nginx only
docker compose logs -f fail2ban     # Fail2ban only
```

**Stop the application:**
```bash
docker compose down
```

**Stop and remove volumes (WARNING: deletes all data):**
```bash
docker compose down -v
```

**Restart services:**
```bash
docker compose restart
```

### Security

The Docker deployment includes multiple security layers:

#### Architecture Overview

```
Internet → nginx:80 → ModSecurity WAF → app:3001
                ↓
           fail2ban (monitors logs)
```

#### ModSecurity Web Application Firewall

- **OWASP Core Rule Set (CRS)** - Industry-standard protection against common attacks
- **Paranoia Level 1** - Balanced protection with minimal false positives
- **Anomaly Scoring** - Blocks requests exceeding threat threshold
- **Protection Against:**
  - SQL Injection
  - Cross-Site Scripting (XSS)
  - Path Traversal
  - Remote Code Execution
  - Command Injection

**Configuration:** `nginx/modsecurity/modsecurity.conf` and `nginx/modsecurity/crs-setup.conf`

#### Fail2ban Intrusion Prevention

Automatically bans IPs that exhibit malicious behavior:

- **nginx-auth jail** - Monitors 401/403 responses (failed authentication)
- **nginx-limit-req jail** - Monitors rate limit violations
- **app-auth jail** - Monitors failed login attempts to `/api/auth/login`

**Default Settings:**
- Ban time: 1 hour
- Find time: 10 minutes
- Max retry: 5 attempts

**Check banned IPs:**
```bash
docker compose exec fail2ban fail2ban-client status nginx-auth
```

**Manually unban an IP:**
```bash
docker compose exec fail2ban fail2ban-client set nginx-auth unbanip <IP_ADDRESS>
```

**Configuration:** `fail2ban/jail.local` and `fail2ban/filter.d/*.conf`

#### Security Headers

Nginx adds security headers to all responses:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Referrer-Policy: no-referrer-when-downgrade` - Controls referrer information

#### Rate Limiting

Nginx limits requests to prevent abuse and DoS attacks:
- Default: 10 requests per second per IP
- Burst: 20 requests (allows temporary spikes)
- Configurable via `RATE_LIMIT` environment variable

#### Network Isolation

- **Frontend network** - Nginx to internet (bridge)
- **Backend network** - Nginx to app (internal, no internet access)
- Only nginx port 80 is exposed to the host

#### Best Practices

1. **Change default passwords** - Update `ADMIN_PASSWORD` in `.env`
2. **Use strong passwords** - 12+ characters, mixed case, numbers, symbols
3. **Monitor logs regularly** - `docker compose logs -f`
4. **Keep images updated** - Rebuild periodically for security patches
5. **Adjust fail2ban settings** - Based on your traffic patterns
6. **Lower rate limits if under attack** - Temporarily reduce `RATE_LIMIT`
7. **Backup data regularly** - Use volume backup commands above

### Troubleshooting

#### Port 80 Already in Use

If port 80 is already in use, change the nginx port:

```bash
# In .env file
NGINX_PORT=8080
```

Then access the application at http://localhost:8080

#### Permission Errors

**Volume mount permissions:**
```bash
# Fix permissions on game data directory
docker compose down
docker volume rm game-data
docker compose up -d
```

**Fail2ban iptables errors:**
Fail2ban requires `NET_ADMIN` and `NET_RAW` capabilities. These are already configured in `docker-compose.yml`.

#### Database Issues

**Reset database to fresh state:**
```bash
docker compose down
docker volume rm game-data
docker compose up -d
```

**View database contents:**
```bash
docker compose exec app ls -la /app/backend/data
```

#### Network Connectivity

**LM Studio not reachable:**

If LM Studio is running on the host machine:
```bash
# In .env file
LMSTUDIO_BASE_URL=http://host.docker.internal:1234
```

If LM Studio is on another machine:
```bash
# In .env file
LMSTUDIO_BASE_URL=http://<IP_ADDRESS>:1234
```

#### Application Not Accessible Through Nginx

**Check service health:**
```bash
docker compose ps
```

All services should show "healthy" status.

**Check nginx logs:**
```bash
docker compose logs nginx
```

**Check app logs:**
```bash
docker compose logs app
```

#### WAF False Positives

If legitimate requests are being blocked by ModSecurity:

1. **Check ModSecurity logs:**
```bash
docker compose logs nginx | grep ModSecurity
```

2. **Adjust paranoia level** in `nginx/modsecurity/crs-setup.conf`:
```
setvar:tx.paranoia_level=1  # Lower = fewer false positives
```

3. **Add rule exclusions** for specific endpoints if needed

#### Fail2ban Not Banning

**Check fail2ban status:**
```bash
docker compose exec fail2ban fail2ban-client status
```

**Check jail status:**
```bash
docker compose exec fail2ban fail2ban-client status nginx-auth
```

**Verify log format** matches filter patterns in `fail2ban/filter.d/*.conf`

#### Health Check Failures

**App health check failing:**
```bash
# Check if app is responding
docker compose exec app wget -O- http://localhost:3001/api/health
```

**Nginx health check failing:**
```bash
# Check if nginx can reach app
docker compose exec nginx wget -O- http://app:3001/api/health
```

## Usage

### Player Commands

- `move <direction>` - Move to an adjacent location (north, south, east, west, up, down)
- `look` - Examine your current surroundings
- `talk <character>` - Speak with a character
- `adventures` - List all available adventures
- `load <adventure-id>` - Load and play a different adventure
- `help` - Display all available commands
- `help <command>` - Get detailed help for a specific command
- `clear` - Clear the terminal screen
- `exit` - Exit the game

### Admin Commands

First, enter admin mode:

```bash
sudo
```

Then use these commands:

- `create-adventure <name>` - Create a new adventure
- `add-location <name> <description>` - Add a location to the adventure
- `add-character <name> <dialogue...>` - Add a character to the current location
- `connect <from-id> <to-id> <direction>` - Connect two locations
- `save` - Save the current adventure
- `list-adventures` - Show all adventures
- `exit` - Return to player mode

### Default Admin Password

The default admin password is: `admin123`

**Important**: Change this in production by modifying the password hash in the database initialization.

## Architecture

- **Frontend**: TypeScript + Vite + xterm.js
- **Backend**: Node.js + Express + SQLite (sql.js with file persistence)
- **Monorepo**: Managed with npm workspaces

## Database Persistence

The game uses SQLite for data storage with automatic file persistence. All adventures, game states, and admin data are saved to disk and survive server restarts.

### Database Location

The database file is stored at:
```
backend/data/game.db
```

This file is automatically created on first startup and updated after every write operation (creating adventures, saving game state, etc.).

### Configuration

You can customize the database location using the `DB_PATH` environment variable:

```bash
# Linux/Mac
export DB_PATH=/path/to/custom/database.db
npm start

# Windows PowerShell
$env:DB_PATH="C:\path\to\custom\database.db"
npm start

# Windows Command Prompt
set DB_PATH=C:\path\to\custom\database.db
npm start
```

### How It Works

- **On Startup**: The server checks for an existing database file
  - If found: Loads the database from disk (preserving all data)
  - If not found: Creates a new database with demo adventure
- **During Operation**: Every write operation (create/update/delete) automatically saves to disk
- **Data Preserved**: Adventures, game states, admin credentials, and all game progress persist across restarts

### Database Management

**Backup Your Database:**
```bash
# Create a backup
cp backend/data/game.db backend/data/game.db.backup

# Restore from backup
cp backend/data/game.db.backup backend/data/game.db
```

**Reset to Fresh Database:**
```bash
# Delete the database file (server will create a new one on next startup)
rm backend/data/game.db        # Linux/Mac
del backend\data\game.db       # Windows
```

**View Database Contents:**
You can use any SQLite browser tool to inspect the database file, such as:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Viewer (VS Code extension)](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)

## Project Structure

```
terminal-adventure-game/
├── frontend/           # Frontend application
│   ├── src/
│   │   ├── admin/     # Administration system
│   │   ├── api/       # API client
│   │   ├── auth/      # Authentication manager
│   │   ├── engine/    # Game engine
│   │   ├── help/      # Help system
│   │   ├── parser/    # Command parser
│   │   ├── terminal/  # Terminal interface
│   │   └── main.ts    # Entry point
│   └── index.html
├── backend/            # Backend API server
│   ├── data/          # Database storage (gitignored)
│   │   └── game.db    # SQLite database file
│   └── src/
│       ├── api/       # Express server
│       ├── auth/      # Authentication
│       ├── database/  # Data store, schema, and persistence
│       └── index.ts   # Entry point
└── package.json       # Root package.json

```

## License

MIT, TypeScript, and Express.

## Project Structure

```
terminal-adventure-game/
├── frontend/          # Frontend application (Vite + TypeScript + xterm.js)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── backend/           # Backend API server (Express + TypeScript + SQLite)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── package.json       # Root workspace configuration
```

## Setup

Install dependencies:

```bash
npm install
```

## Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001
```

## Build

Build both frontend and backend:

```bash
npm run build
```

## Production

Start the production server:

```bash
npm start
```

## Technology Stack

- **Frontend**: TypeScript, Vite, xterm.js
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with sql.js
- **Authentication**: bcryptjs for password hashing
