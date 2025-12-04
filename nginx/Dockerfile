# Nginx with ModSecurity WAF
FROM owasp/modsecurity-crs:nginx-alpine

# Switch to root to install packages
USER root

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy ModSecurity configuration
COPY modsecurity/modsecurity.conf /etc/modsecurity.d/modsecurity.conf
COPY modsecurity/crs-setup.conf /etc/modsecurity.d/owasp-crs/crs-setup.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Log directory already exists in base image, just ensure it's writable
RUN touch /var/log/nginx/modsec_audit.log /var/log/nginx/modsec_debug.log || true

# Expose HTTP port
EXPOSE 80

# Use entrypoint to substitute environment variables
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
