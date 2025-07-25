#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Confidence Compass Development Environment...\n');

// Start the main server
const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  shell: true
});

// Start the Python head pose detection server
const pythonServer = spawn('python', ['server/head-pose-detector.py'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
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
  pythonServer.kill();
  client.kill();
  process.exit();
});

// Handle process errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

pythonServer.on('error', (err) => {
  console.error('❌ Python server error:', err);
});

client.on('error', (err) => {
  console.error('❌ Client error:', err);
});

console.log('✅ All services started!');
console.log('📱 Client: http://localhost:3000');
console.log('🔧 Server: http://localhost:5000');
console.log('🤖 Python Head Pose: http://localhost:5001');
console.log('\nPress Ctrl+C to stop all services\n'); 