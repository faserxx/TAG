# Export Docker images for transfer to another host (PowerShell)
# Usage: .\export-docker-images.ps1 [-OutputDir PATH]

param(
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$exportFile = Join-Path $OutputDir "terminal-adventure-game-$timestamp.tar"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Exporting Terminal Adventure Game Docker Images" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Output file: $exportFile" -ForegroundColor White
Write-Host ""

# Check if images exist
Write-Host "Checking for images..." -ForegroundColor Yellow
$images = @(
    "terminal-adventure-game:latest",
    "adventure-game-nginx:latest",
    "adventure-game-fail2ban:latest"
)

foreach ($image in $images) {
    try {
        docker image inspect $image | Out-Null
        Write-Host "  [OK] Found: $image" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Image $image not found!" -ForegroundColor Red
        Write-Host "   Please build the images first with: docker compose build" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Exporting images to tar file..." -ForegroundColor Yellow

try {
    $imageList = $images -join " "
    Invoke-Expression "docker save -o `"$exportFile`" $imageList"
    
    $fileSize = (Get-Item $exportFile).Length / 1MB
    $fileSizeFormatted = "{0:N2} MB" -f $fileSize
    
    Write-Host ""
    Write-Host "[SUCCESS] Export completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Export file: $exportFile" -ForegroundColor White
    Write-Host "File size: $fileSizeFormatted" -ForegroundColor White
    Write-Host ""
    Write-Host "To import on another host:" -ForegroundColor White
    Write-Host "  1. Transfer the file to remote host" -ForegroundColor Gray
    Write-Host "  2. Import on remote: docker load -i $(Split-Path $exportFile -Leaf)" -ForegroundColor Gray
    Write-Host "  3. Copy docker-compose.prod.yml and .env to remote host" -ForegroundColor Gray
    Write-Host "  4. Start services: docker compose -f docker-compose.prod.yml up -d" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "[ERROR] Export failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
