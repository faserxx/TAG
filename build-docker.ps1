# Build script for Terminal Adventure Game Docker images (PowerShell)
# Usage: .\build-docker.ps1 [VERSION] [-Platform PLATFORM]
#
# Examples:
#   .\build-docker.ps1                                    # Build with 'latest' tag
#   .\build-docker.ps1 -Version 1.0.0                     # Build with version '1.0.0'
#   .\build-docker.ps1 -Version 1.0.0 -Platform "linux/amd64,linux/arm64"  # Multi-arch build

param(
    [string]$Version = "latest",
    [string]$Platform = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building Terminal Adventure Game Docker Images" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor White
if ($Platform) {
    Write-Host "Platform: $Platform" -ForegroundColor White
}
Write-Host ""

# Build command
$buildCmd = "docker compose build"

if ($Platform) {
    $buildCmd += " --build-arg BUILDPLATFORM=$Platform"
}

# Execute build
Write-Host "Building images..." -ForegroundColor Yellow
try {
    Invoke-Expression $buildCmd
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build command failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Tag images with version
Write-Host ""
Write-Host "Tagging images with version: $Version" -ForegroundColor Yellow

docker tag terminal-adventure-game:latest terminal-adventure-game:$Version
docker tag adventure-game-nginx:latest adventure-game-nginx:$Version
docker tag adventure-game-fail2ban:latest adventure-game-fail2ban:$Version

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Images created:" -ForegroundColor White
Write-Host "  - terminal-adventure-game:$Version" -ForegroundColor Gray
Write-Host "  - terminal-adventure-game:latest" -ForegroundColor Gray
Write-Host "  - adventure-game-nginx:$Version" -ForegroundColor Gray
Write-Host "  - adventure-game-nginx:latest" -ForegroundColor Gray
Write-Host "  - adventure-game-fail2ban:$Version" -ForegroundColor Gray
Write-Host "  - adventure-game-fail2ban:latest" -ForegroundColor Gray
Write-Host ""
Write-Host "To start the application:" -ForegroundColor White
Write-Host "  docker compose up -d" -ForegroundColor Cyan
Write-Host ""
