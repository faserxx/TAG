#!/bin/sh
set -e

# Set default values for environment variables
export RATE_LIMIT=${RATE_LIMIT:-10r/s}
export CLIENT_MAX_BODY_SIZE=${CLIENT_MAX_BODY_SIZE:-10M}

# Substitute environment variables in nginx config
envsubst '${RATE_LIMIT} ${CLIENT_MAX_BODY_SIZE}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Execute the CMD
exec "$@"
