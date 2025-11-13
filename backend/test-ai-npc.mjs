/**
 * Test script for AI NPC in demo adventure
 * Verifies that the Ancient Sage appears in the Inner Sanctum
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const TEST_PORT = 3003;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let serverProcess = null;

async function startServer() {
  log('\nStarting server...', 'yellow');
  
  return new Promise((resolve, reject) => {
    serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: TEST_PORT.toString() }
    });

    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      if (output.includes('Server ready')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    serverProcess.on('error', reject);
    
    setTimeout(30000).then(() => {
      if (!output.includes('Server ready')) {
        reject(new Error('Server failed to start within 30 seconds'));
      }
    });
  });
}

async function stopServer() {
  if (serverProcess) {
    log('\nStopping server...', 'yellow');
    
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', serverProcess.pid.toString(), '/T', '/F'], { shell: true });
      } catch (e) {
        // Ignore errors
      }
    } else {
      serverProcess.kill('SIGINT');
    }
    
    await setTimeout(3000);
    serverProcess = null;
  }
}

async function apiRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

async function runTest() {
  try {
    log('\n=== Testing AI NPC in Demo Adventure ===\n', 'cyan');
    
    // Start server
    await startServer();
    await setTimeout(2000);
    
    // Test 1: Verify demo adventure exists
    log('\n[Test 1] Checking demo adventure exists...', 'cyan');
    const adventures = await apiRequest('/adventures');
    const demoAdv = adventures.find(a => a.id === 'demo-adventure');
    
    if (!demoAdv) {
      log('✗ Demo adventure not found', 'red');
      return 1;
    }
    log('✓ Demo adventure found', 'green');
    
    // Test 2: Load demo adventure and check for Inner Sanctum
    log('\n[Test 2] Checking Inner Sanctum location exists...', 'cyan');
    const adventure = await apiRequest('/adventures/demo-adventure');
    const locations = Array.isArray(adventure.locations) ? adventure.locations : Object.values(adventure.locations);
    const sanctum = locations.find(loc => loc.id === 'sanctum');
    
    if (!sanctum) {
      log('✗ Inner Sanctum location not found', 'red');
      return 1;
    }
    log(`✓ Inner Sanctum found: "${sanctum.name}"`, 'green');
    log(`  Description: ${sanctum.description.substring(0, 100)}...`, 'yellow');
    
    // Test 3: Verify Ancient Sage exists in Inner Sanctum
    log('\n[Test 3] Checking Ancient Sage character exists...', 'cyan');
    const sage = sanctum.characters.find(char => char.id === 'ancient-sage');
    
    if (!sage) {
      log('✗ Ancient Sage not found in Inner Sanctum', 'red');
      return 1;
    }
    log(`✓ Ancient Sage found: "${sage.name}"`, 'green');
    
    // Test 4: Verify AI configuration
    log('\n[Test 4] Verifying AI configuration...', 'cyan');
    
    if (!sage.isAiPowered) {
      log('✗ Ancient Sage is not marked as AI-powered', 'red');
      return 1;
    }
    log('✓ isAiPowered: true', 'green');
    
    if (!sage.personality) {
      log('✗ Ancient Sage has no personality description', 'red');
      return 1;
    }
    log(`✓ Personality: ${sage.personality.substring(0, 80)}...`, 'green');
    
    if (!sage.aiConfig) {
      log('✗ Ancient Sage has no AI config', 'red');
      return 1;
    }
    log(`✓ AI Config:`, 'green');
    log(`  - temperature: ${sage.aiConfig.temperature}`, 'yellow');
    log(`  - maxTokens: ${sage.aiConfig.maxTokens}`, 'yellow');
    
    if (sage.aiConfig.temperature !== 0.8) {
      log('✗ Temperature should be 0.8', 'red');
      return 1;
    }
    
    if (sage.aiConfig.maxTokens !== 150) {
      log('✗ maxTokens should be 150', 'red');
      return 1;
    }
    
    // Test 5: Verify exits to Inner Sanctum
    log('\n[Test 5] Verifying navigation to Inner Sanctum...', 'cyan');
    const hall = locations.find(loc => loc.id === 'hall');
    
    if (!hall) {
      log('✗ Great Hall not found', 'red');
      return 1;
    }
    
    if (!hall.exits.north || hall.exits.north !== 'sanctum') {
      log('✗ No north exit from Great Hall to Inner Sanctum', 'red');
      return 1;
    }
    log('✓ Great Hall has north exit to Inner Sanctum', 'green');
    
    if (!sanctum.exits.south || sanctum.exits.south !== 'hall') {
      log('✗ No south exit from Inner Sanctum to Great Hall', 'red');
      return 1;
    }
    log('✓ Inner Sanctum has south exit to Great Hall', 'green');
    
    // Success!
    log('\n' + '='.repeat(60), 'cyan');
    log('✓ All AI NPC tests passed!', 'green');
    log('='.repeat(60), 'cyan');
    log('\nThe Ancient Sage is ready for conversation in the Inner Sanctum.', 'yellow');
    log('To test the chat functionality, you need to:', 'yellow');
    log('  1. Ensure LMStudio is running on http://localhost:1234', 'yellow');
    log('  2. Start the game and navigate: north (to hall), north (to sanctum)', 'yellow');
    log('  3. Use the "chat" command to talk with the Ancient Sage', 'yellow');
    
    return 0;
    
  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, 'red');
    console.error(error);
    return 1;
  } finally {
    await stopServer();
  }
}

runTest().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
