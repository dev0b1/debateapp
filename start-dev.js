#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Confidence Compass Development Environment...\n');

// Check if tsx is available, otherwise use node with tsx
let serverCommand = 'tsx';
let serverArgs = ['server/index.ts'];

// Try to use npx tsx if tsx is not available globally
try {
  await import('tsx');
} catch (e) {
  console.log('📦 Using npx tsx...');
  serverCommand = 'npx';
  serverArgs = ['tsx', 'server/index.ts'];
}

// Start the main server
const server = spawn(serverCommand, serverArgs, {
  stdio: 'inherit',
  shell: true
});

// Start the client
const client = spawn('vite', ['--port', '3000'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(process.cwd(), 'client')
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  server.kill();
  client.kill();
  process.exit();
});

// Handle process errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

client.on('error', (err) => {
  console.error('❌ Client error:', err);
});

console.log('✅ All services started!');
console.log('📱 Client: http://localhost:3000');
console.log('🔧 Server: http://localhost:5000');
console.log('🎤 Voice Analysis: Client-side processing');
console.log('\nPress Ctrl+C to stop all services\n'); 