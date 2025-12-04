/**
 * Docker Deployment Integration Tests
 * 
 * These tests verify the Docker deployment configuration and functionality.
 * They require Docker and Docker Compose to be installed and running.
 * 
 * Run with: node docker-deployment.test.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { strict as assert } from 'assert';

const execAsync = promisify(exec);

// Test configuration
const TEST_VERSION = 'test';
const TEST_PORT = 8080;
const TEST_TIMEOUT = 120000; // 2 minutes for Docker operations

// Helper function to run shell commands
async function runCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: options.timeout || 30000,
      ...options
    });
    return { stdout, stderr, success: true };
  } catch (error) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message, 
      success: false,
      error 
    };
  }
}

// Helper function to wait for a condition
async function waitFor(condition, timeout = 30000, interval = 1000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

// Test suite
const tests = [];
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🐳 Docker Deployment Integration Tests\n');
  console.log('=' .repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      process.stdout.write(`\n📋 ${name}... `);
      await fn();
      console.log('✅ PASSED');
      testsPassed++;
    } catch (error) {
      console.log('❌ FAILED');
      console.error(`   Error: ${error.message}`);
      if (error.details) {
        console.error(`   Details: ${error.details}`);
      }
      testsFailed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed, ${tests.length} total\n`);
  
  return testsFailed === 0;
}

// ============================================
// Test 12.1: Build creates images
// ============================================
test('12.1 - Build creates images with correct tags', async () => {
  console.log('\n   Building images...');
  
  // Build images using docker compose
  const buildResult = await runCommand('docker compose build', { timeout: TEST_TIMEOUT });
  
  if (!buildResult.success) {
    throw new Error(`Build failed: ${buildResult.stderr}`);
  }
  
  // Verify images exist
  const images = [
    'terminal-adventure-game:latest',
    'adventure-game-nginx:latest',
    'adventure-game-fail2ban:latest'
  ];
  
  for (const image of images) {
    const inspectResult = await runCommand(`docker image inspect ${image}`);
    assert.ok(inspectResult.success, `Image ${image} not found`);
  }
  
  console.log('   All images created successfully');
});

// ============================================
// Test 12.2: Images contain required files
// ============================================
test('12.2 - Images contain required files', async () => {
  // Check app image for compiled assets
  const appCheck = await runCommand(
    'docker run --rm terminal-adventure-game:latest ls -la /app/backend/dist /app/frontend/dist'
  );
  
  assert.ok(appCheck.success, 'App image missing compiled assets');
  assert.ok(appCheck.stdout.includes('index.js'), 'Backend dist missing index.js');
  
  // Check nginx image for configuration
  const nginxCheck = await runCommand(
    'docker run --rm adventure-game-nginx:latest ls -la /etc/nginx/nginx.conf'
  );
  
  assert.ok(nginxCheck.success, 'Nginx image missing configuration');
  
  console.log('   All required files present');
});

// ============================================
// Test 12.3: Container starts and initializes database
// ============================================
test('12.3 - Container starts and initializes database', async () => {
  console.log('\n   Starting containers...');
  
  // Start only the app service for this test
  const startResult = await runCommand(
    'docker compose up -d app',
    { timeout: TEST_TIMEOUT }
  );
  
  assert.ok(startResult.success, `Failed to start app: ${startResult.stderr}`);
  
  // Wait for container to be healthy
  const isHealthy = await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  assert.ok(isHealthy, 'App container did not become healthy');
  
  // Check if database file was created
  const dbCheck = await runCommand(
    'docker compose exec -T app ls -la /app/backend/data/game.db'
  );
  
  assert.ok(dbCheck.success, 'Database file not created');
  
  console.log('   Database initialized successfully');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.4: Data persistence with volumes
// ============================================
test('12.4 - Data persistence with volumes', async () => {
  console.log('\n   Testing data persistence...');
  
  // Start containers
  await runCommand('docker compose up -d app', { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  // Create a test file in the data directory
  const testData = 'test-persistence-' + Date.now();
  await runCommand(
    `docker compose exec -T app sh -c 'echo "${testData}" > /app/backend/data/test.txt'`
  );
  
  // Stop containers
  await runCommand('docker compose down');
  
  // Start containers again
  await runCommand('docker compose up -d app', { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  // Verify test file still exists
  const checkResult = await runCommand(
    'docker compose exec -T app cat /app/backend/data/test.txt'
  );
  
  assert.ok(checkResult.success, 'Test file not found after restart');
  assert.ok(checkResult.stdout.includes(testData), 'Test data not persisted');
  
  console.log('   Data persisted successfully');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.5: Application accessible through nginx
// ============================================
test('12.5 - Application accessible through nginx', async () => {
  console.log('\n   Starting full stack...');
  
  // Start all services
  const startResult = await runCommand(
    `NGINX_PORT=${TEST_PORT} docker compose up -d`,
    { timeout: TEST_TIMEOUT }
  );
  
  assert.ok(startResult.success, `Failed to start stack: ${startResult.stderr}`);
  
  // Wait for services to be healthy
  const isHealthy = await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps');
    const output = healthResult.stdout;
    return output.includes('healthy') && !output.includes('starting');
  }, 90000);
  
  assert.ok(isHealthy, 'Services did not become healthy');
  
  // Test HTTP request through nginx
  const curlResult = await runCommand(
    `curl -s -o /dev/null -w "%{http_code}" http://localhost:${TEST_PORT}/api/health`
  );
  
  assert.ok(curlResult.success, 'Failed to connect to nginx');
  assert.strictEqual(curlResult.stdout.trim(), '200', 'Health endpoint returned non-200 status');
  
  console.log('   Application accessible through nginx');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.6: Security headers present
// ============================================
test('12.6 - Security headers present', async () => {
  console.log('\n   Checking security headers...');
  
  // Start services if not already running
  await runCommand(`NGINX_PORT=${TEST_PORT} docker compose up -d`, { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps');
    return healthResult.stdout.includes('healthy');
  }, 90000);
  
  // Get headers from nginx
  const headersResult = await runCommand(
    `curl -s -I http://localhost:${TEST_PORT}/api/health`
  );
  
  assert.ok(headersResult.success, 'Failed to get headers');
  
  const headers = headersResult.stdout.toLowerCase();
  
  // Check for security headers
  assert.ok(headers.includes('x-frame-options'), 'Missing X-Frame-Options header');
  assert.ok(headers.includes('x-content-type-options'), 'Missing X-Content-Type-Options header');
  assert.ok(headers.includes('x-xss-protection'), 'Missing X-XSS-Protection header');
  assert.ok(headers.includes('referrer-policy'), 'Missing Referrer-Policy header');
  
  console.log('   All security headers present');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.7: Default configuration values
// ============================================
test('12.7 - Default configuration values', async () => {
  console.log('\n   Testing default configuration...');
  
  // Start without environment variables
  await runCommand('docker compose up -d app', { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  // Check that app is running on default port 3001
  const portCheck = await runCommand(
    'docker compose exec -T app netstat -tuln | grep 3001'
  );
  
  assert.ok(portCheck.success, 'App not listening on default port 3001');
  
  console.log('   Default configuration working');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.8: Non-root user execution
// ============================================
test('12.8 - Non-root user execution', async () => {
  console.log('\n   Checking process user...');
  
  // Start app
  await runCommand('docker compose up -d app', { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  // Check process user
  const userCheck = await runCommand(
    'docker compose exec -T app ps aux | grep "node dist/index.js"'
  );
  
  assert.ok(userCheck.success, 'Failed to check process user');
  assert.ok(!userCheck.stdout.includes('root'), 'Process running as root');
  assert.ok(userCheck.stdout.includes('node'), 'Process not running as node user');
  
  console.log('   Process running as non-root user');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.9: Health check endpoint
// ============================================
test('12.9 - Health check endpoint', async () => {
  console.log('\n   Testing health check endpoint...');
  
  // Start app
  await runCommand('docker compose up -d app', { timeout: TEST_TIMEOUT });
  
  // Wait for healthy
  await waitFor(async () => {
    const healthResult = await runCommand('docker compose ps app');
    return healthResult.stdout.includes('healthy');
  }, 60000);
  
  // Call health endpoint directly
  const healthResult = await runCommand(
    'docker compose exec -T app wget -q -O- http://localhost:3001/api/health'
  );
  
  assert.ok(healthResult.success, 'Health endpoint not responding');
  assert.ok(healthResult.stdout.includes('ok'), 'Health endpoint returned unexpected response');
  
  console.log('   Health check endpoint working');
  
  // Cleanup
  await runCommand('docker compose down');
});

// ============================================
// Test 12.10: Volume mount point defined
// ============================================
test('12.10 - Volume mount point defined', async () => {
  console.log('\n   Checking volume mount point...');
  
  // Inspect image metadata
  const inspectResult = await runCommand(
    'docker image inspect terminal-adventure-game:latest'
  );
  
  assert.ok(inspectResult.success, 'Failed to inspect image');
  
  const metadata = JSON.parse(inspectResult.stdout);
  const volumes = metadata[0]?.Config?.Volumes || {};
  
  assert.ok(
    volumes['/app/backend/data'],
    'Volume mount point /app/backend/data not defined in image'
  );
  
  console.log('   Volume mount point defined');
});

// ============================================
// Run all tests
// ============================================
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
