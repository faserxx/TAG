#!/bin/bash
set -e

# Set default values
export FAIL2BAN_BANTIME=${FAIL2BAN_BANTIME:-3600}
export FAIL2BAN_FINDTIME=${FAIL2BAN_FINDTIME:-600}
export FAIL2BAN_MAXRETRY=${FAIL2BAN_MAXRETRY:-5}

# Substitute environment variables in jail.local
envsubst '$FAIL2BAN_BANTIME $FAIL2BAN_FINDTIME $FAIL2BAN_MAXRETRY' < /etc/fail2ban/jail.local > /etc/fail2ban/jail.local.tmp
mv /etc/fail2ban/jail.local.tmp /etc/fail2ban/jail.local

# Start fail2ban in foreground
echo "Starting fail2ban..."
echo "Configuration:"
echo "  Ban time: $FAIL2BAN_BANTIME seconds"
echo "  Find time: $FAIL2BAN_FINDTIME seconds"
echo "  Max retry: $FAIL2BAN_MAXRETRY attempts"

exec fail2ban-server -f -x -v start
