# Fail2ban container for intrusion prevention
FROM alpine:latest

# Install fail2ban and iptables
RUN apk add --no-cache \
    fail2ban \
    iptables \
    ip6tables \
    bash \
    tzdata \
    gettext

# Create necessary directories
RUN mkdir -p /var/run/fail2ban \
    /var/log/fail2ban \
    /etc/fail2ban/jail.d \
    /etc/fail2ban/filter.d

# Copy configuration files
COPY jail.local /etc/fail2ban/jail.local
COPY filter.d/*.conf /etc/fail2ban/filter.d/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Volume for persistent ban database
VOLUME ["/var/lib/fail2ban"]

# Entrypoint
ENTRYPOINT ["/entrypoint.sh"]
