# Implementation Plan

- [x] 1. Create application Dockerfile with multi-stage build





  - Create Dockerfile in project root
  - Implement dependency installation stage
  - Implement build stage for TypeScript compilation and Vite build
  - Implement production stage with minimal runtime image
  - Configure non-root user execution
  - Add health check endpoint support
  - Define volume mount point for database
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3, 5.1, 5.3_

- [x] 2. Add health check endpoint to backend


  - Create /health route in Express server
  - Return 200 status with basic health information
  - _Requirements: 4.5_

- [x] 3. Create .dockerignore file


  - Exclude node_modules, dist, .git, and other unnecessary files
  - Optimize build context size
  - _Requirements: 1.2_

- [x] 4. Create nginx configuration and Dockerfile

  - [x] 4.1 Create nginx directory structure


    - Create nginx/ directory
    - Create nginx/conf.d/ for configuration files
    - Create nginx/modsecurity/ for WAF rules
    - _Requirements: 7.1_

  - [x] 4.2 Create nginx.conf with reverse proxy configuration


    - Configure upstream to app:3001
    - Add proxy headers (X-Real-IP, X-Forwarded-For, etc.)
    - Configure access and error logging
    - _Requirements: 7.1_

  - [x] 4.3 Add security headers configuration


    - Add X-Frame-Options: DENY
    - Add X-Content-Type-Options: nosniff
    - Add X-XSS-Protection: 1; mode=block
    - Add Referrer-Policy: no-referrer-when-downgrade
    - _Requirements: 8.3_

  - [x] 4.4 Add rate limiting configuration


    - Define limit_req_zone for IP-based rate limiting
    - Apply rate limit to all routes
    - Configure burst and nodelay parameters
    - _Requirements: 8.4_

  - [x] 4.5 Create nginx Dockerfile


    - Base on owasp/modsecurity-crs:nginx-alpine
    - Copy nginx configuration files
    - Copy ModSecurity configuration
    - Expose port 80
    - _Requirements: 7.1, 7.2_

- [x] 5. Configure ModSecurity WAF


  - [x] 5.1 Create modsecurity.conf


    - Enable ModSecurity engine
    - Configure request body inspection
    - Configure response body inspection
    - Set anomaly scoring mode
    - _Requirements: 7.2_

  - [x] 5.2 Create crs-setup.conf


    - Configure OWASP CRS paranoia level
    - Set inbound and outbound anomaly thresholds
    - Configure allowed HTTP methods
    - _Requirements: 7.2_

  - [x] 5.3 Configure security event logging


    - Set audit log path
    - Configure log format
    - Enable relevant log types
    - _Requirements: 7.5_

- [x] 6. Create fail2ban configuration and Dockerfile

  - [x] 6.1 Create fail2ban directory structure


    - Create fail2ban/ directory
    - Create fail2ban/jail.d/ for jail configurations
    - Create fail2ban/filter.d/ for custom filters
    - _Requirements: 8.1_

  - [x] 6.2 Create jail.local configuration


    - Configure nginx-auth jail for 401/403 responses
    - Configure nginx-limit-req jail for rate limit violations
    - Set ban time, find time, and max retry from environment variables
    - _Requirements: 8.1, 8.2_

  - [x] 6.3 Create custom filters if needed


    - Create filter for application authentication logs
    - Define regex patterns for failed login attempts
    - _Requirements: 8.2, 8.5_

  - [x] 6.4 Create fail2ban Dockerfile


    - Base on alpine:latest
    - Install fail2ban and iptables
    - Copy configuration files
    - Create entrypoint script to start fail2ban
    - _Requirements: 8.1_

- [x] 7. Create Docker Compose configuration


  - [x] 7.1 Create docker-compose.yml


    - Define app service with build context and environment variables
    - Define nginx service with port mapping and dependencies
    - Define fail2ban service with network_mode: host and capabilities
    - _Requirements: 7.1, 7.4, 8.1_

  - [x] 7.2 Configure Docker networks

    - Create frontend network for nginx to internet
    - Create backend network (internal) for nginx to app
    - _Requirements: 7.4_

  - [x] 7.3 Configure Docker volumes

    - Define game-data volume for database persistence
    - Define nginx-logs volume for shared logging
    - Define fail2ban-data volume for ban state persistence
    - _Requirements: 5.1, 7.5_

  - [x] 7.4 Add health checks to services

    - Configure health check for app service
    - Configure health check for nginx service
    - _Requirements: 4.5_

- [x] 8. Update backend to support ROOT_PASSWORD environment variable



  - Check if root password configuration exists in codebase
  - Add ROOT_PASSWORD environment variable support if needed
  - Update authentication logic to use configurable root password
  - _Requirements: 6.4_

- [x] 9. Create build script

  - [x] 9.1 Create build-docker.sh for Linux/Mac


    - Parse command-line arguments for version tag
    - Execute docker-compose build with appropriate flags
    - Tag images with version and latest
    - Display build progress
    - Handle errors with non-zero exit codes
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 9.2 Create build-docker.ps1 for Windows


    - Implement same functionality as bash script
    - Use PowerShell syntax and conventions
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 9.3 Add multi-architecture build support


    - Add --platform flag support to build scripts
    - Document usage for building arm64 and amd64 images
    - _Requirements: 3.5_

- [x] 10. Create .env.example file



  - Document all environment variables with descriptions
  - Provide sensible default values
  - Include LM Studio configuration examples
  - Include security configuration examples
  - _Requirements: 6.5, 6.6_

- [x] 11. Update README with Docker documentation

  - [x] 11.1 Add Docker Build section


    - Document prerequisites
    - Explain build script usage
    - Provide build command examples
    - _Requirements: 9.1_

  - [x] 11.2 Add Docker Compose Deployment section

    - Document quick start with docker-compose up
    - Explain environment variable configuration
    - Document volume mounting
    - Explain how to access the application
    - _Requirements: 9.2, 9.3_

  - [x] 11.3 Add Security section

    - Document security architecture overview
    - Explain ModSecurity WAF configuration
    - Document fail2ban usage and tuning
    - Provide security best practices
    - _Requirements: 9.3_

  - [x] 11.4 Add Troubleshooting section

    - Document common issues and solutions
    - Explain how to view logs
    - Document how to check banned IPs
    - Explain how to manually unban IPs
    - _Requirements: 9.5_

- [x] 12. Write integration tests for Docker deployment

  - [x] 12.1 Test: Build creates images


    - Run build script
    - Verify all images exist with correct tags
    - _Requirements: 1.1, 1.4_

  - [x] 12.2 Test: Images contain required files

    - Inspect built images
    - Verify presence of compiled assets and dependencies
    - _Requirements: 1.3_

  - [x] 12.3 Test: Container starts and initializes database

    - Start containers with docker-compose
    - Verify database file is created
    - _Requirements: 2.1_

  - [x] 12.4 Test: Data persistence with volumes

    - Start containers, create game data
    - Stop containers
    - Start containers again
    - Verify data persists
    - _Requirements: 2.3, 5.2_

  - [x] 12.5 Test: Application accessible through nginx

    - Start full stack
    - Send HTTP request to nginx port
    - Verify response from application
    - _Requirements: 7.1_

  - [x] 12.6 Test: Security headers present

    - Send request through nginx
    - Verify security headers in response
    - _Requirements: 8.3_

  - [x] 12.7 Test: Default configuration values

    - Start containers without environment variables
    - Verify application uses defaults
    - _Requirements: 6.6_

  - [x] 12.8 Test: Non-root user execution

    - Start app container
    - Check process user
    - Verify not running as root
    - _Requirements: 4.1_

  - [x] 12.9 Test: Health check endpoint

    - Start app container
    - Call /health endpoint
    - Verify 200 response
    - _Requirements: 4.5_

  - [x] 12.10 Test: Volume mount point defined

    - Inspect app image metadata
    - Verify VOLUME directive present
    - _Requirements: 5.1, 5.3_

- [x] 13. Write property-based tests for Docker deployment

  - [x] 13.1 Property test: Environment variable configuration

    - **Property 1: Environment variable configuration**
    - **Validates: Requirements 2.5, 6.1, 6.3, 6.4**
    - Generate random valid values for environment variables
    - Start containers with those values
    - Verify application uses configured values

  - [x] 13.2 Property test: Port binding

    - **Property 2: Port binding**
    - **Validates: Requirements 2.2, 6.2**
    - Generate random valid port numbers
    - Start container with PORT environment variable
    - Verify container listens on specified port

  - [x] 13.3 Property test: WAF malicious request blocking

    - **Property 3: WAF malicious request blocking**
    - **Validates: Requirements 7.3**
    - Generate random malicious payloads (SQL injection, XSS, path traversal)
    - Send requests through nginx
    - Verify all blocked with 403 status

  - [x] 13.4 Property test: Fail2ban brute force protection

    - **Property 4: Fail2ban brute force protection**
    - **Validates: Requirements 8.2**
    - Generate random IP addresses
    - Simulate failed authentication attempts exceeding threshold
    - Verify IP is banned

  - [x] 13.5 Property test: Rate limiting

    - **Property 5: Rate limiting**
    - **Validates: Requirements 8.4**
    - Generate random request rates above threshold
    - Send requests at high rate
    - Verify 429 status returned

- [x] 14. Final checkpoint - Verify deployment works end-to-end


  - Ensure all tests pass, ask the user if questions arise
  - Build all images using build script
  - Start full stack with docker-compose up
  - Verify application is accessible at http://localhost
  - Test basic game functionality through nginx
  - Verify security components are active (check logs)
  - Stop and clean up containers
