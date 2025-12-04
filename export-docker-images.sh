#!/bin/bash
# Export Docker images for transfer to another host
# Usage: ./export-docker-images.sh [OUTPUT_DIR]

set -e

OUTPUT_DIR="${1:-.}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="${OUTPUT_DIR}/terminal-adventure-game-${TIMESTAMP}.tar"

echo "=========================================="
echo "Exporting Terminal Adventure Game Docker Images"
echo "=========================================="
echo "Output file: $EXPORT_FILE"
echo ""

# Check if images exist
echo "Checking for images..."
IMAGES=(
  "terminal-adventure-game:latest"
  "adventure-game-nginx:latest"
  "adventure-game-fail2ban:latest"
)

for image in "${IMAGES[@]}"; do
  if ! docker image inspect "$image" > /dev/null 2>&1; then
    echo "❌ Error: Image $image not found!"
    echo "   Please build the images first with: docker compose build"
    exit 1
  fi
  echo "  ✓ Found: $image"
done

echo ""
echo "Exporting images to tar file..."
docker save -o "$EXPORT_FILE" "${IMAGES[@]}"

if [ $? -eq 0 ]; then
  FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
  echo ""
  echo "✅ Export completed successfully!"
  echo ""
  echo "Export file: $EXPORT_FILE"
  echo "File size: $FILE_SIZE"
  echo ""
  echo "To import on another host:"
  echo "  1. Transfer the file: scp $EXPORT_FILE user@remote-host:/path/"
  echo "  2. Import on remote: docker load -i $(basename $EXPORT_FILE)"
  echo "  3. Copy docker-compose.prod.yml and .env to remote host"
  echo "  4. Start services: docker compose -f docker-compose.prod.yml up -d"
  echo ""
else
  echo ""
  echo "❌ Export failed!"
  exit 1
fi
