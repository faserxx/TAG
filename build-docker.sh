#!/bin/bash
# Build script for Terminal Adventure Game Docker images
# Usage: ./build-docker.sh [VERSION] [--platform PLATFORM]
#
# Examples:
#   ./build-docker.sh                           # Build with 'latest' tag
#   ./build-docker.sh 1.0.0                     # Build with version '1.0.0'
#   ./build-docker.sh 1.0.0 --platform linux/amd64,linux/arm64  # Multi-arch build

set -e

# Default values
VERSION="${1:-latest}"
PLATFORM=""

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./build-docker.sh [VERSION] [--platform PLATFORM]"
      exit 1
      ;;
  esac
done

echo "=========================================="
echo "Building Terminal Adventure Game Docker Images"
echo "=========================================="
echo "Version: $VERSION"
if [ -n "$PLATFORM" ]; then
  echo "Platform: $PLATFORM"
fi
echo ""

# Build command
BUILD_CMD="docker compose build"

if [ -n "$PLATFORM" ]; then
  BUILD_CMD="$BUILD_CMD --build-arg BUILDPLATFORM=$PLATFORM"
fi

# Execute build
echo "Building images..."
eval $BUILD_CMD

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed!"
  exit 1
fi

# Tag images with version
echo ""
echo "Tagging images with version: $VERSION"

docker tag terminal-adventure-game:latest terminal-adventure-game:$VERSION
docker tag adventure-game-nginx:latest adventure-game-nginx:$VERSION
docker tag adventure-game-fail2ban:latest adventure-game-fail2ban:$VERSION

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "Images created:"
echo "  - terminal-adventure-game:$VERSION"
echo "  - terminal-adventure-game:latest"
echo "  - adventure-game-nginx:$VERSION"
echo "  - adventure-game-nginx:latest"
echo "  - adventure-game-fail2ban:$VERSION"
echo "  - adventure-game-fail2ban:latest"
echo ""
echo "To start the application:"
echo "  docker compose up -d"
echo ""
