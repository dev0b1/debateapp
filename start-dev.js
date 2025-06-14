#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Confidence Compass - Development Server');
console.log('==========================================\n');

// Check if .env file exists
if (!existsSync('.env')) {
  console.log('⚠️  No .env file found!');
  console.log('📝 Creating .env file with placeholder values...\n');
  
  const envContent = `# LiveKit Configuration (Required for real-time communication)
# Get these from https://cloud.livekit.io/ or your self-hosted LiveKit instance
LIVEKIT_URL=wss://your-livekit-instance.com
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Deepgram Configuration (Required for speech-to-text and TTS)
# Get this from https://deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI/OpenRouter Configuration (Required for AI conversation)
# Get this from https://openrouter.ai/ or use your OpenAI API key
OPENROUTER_API_KEY=your_openrouter_api_key

# Frontend Environment Variables (Required for client-side features)
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key

# Development Configuration
NODE_ENV=development
`;

  try {
    const fs = await import('fs');
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created .env file with placeholder values');
    console.log('📝 Please edit .env file with your actual API keys\n');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ .env file found');
}

// Check if node_modules exists
if (!existsSync('node_modules')) {
  console.log('📦 Installing Node.js dependencies...');
  const install = spawn('npm', ['install'], { stdio: 'inherit' });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Node.js dependencies installed');
      startDevelopment();
    } else {
      console.error('❌ Failed to install Node.js dependencies');
      process.exit(1);
    }
  });
} else {
  console.log('✅ Node.js dependencies found');
  startDevelopment();
}

function startDevelopment() {
  console.log('\n🚀 Starting development servers...\n');
  
  // Start the backend server
  console.log('🔧 Starting backend server on port 5000...');
  const server = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
    shell: true
  });
  
  // Give the server a moment to start
  setTimeout(() => {
    console.log('🌐 Starting frontend development server...');
    const client = spawn('npx', ['vite', '--port', '3000'], { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
      shell: true
    });
    
    client.on('close', (code) => {
      console.log(`\n👋 Frontend server stopped with code ${code}`);
    });
    
    client.on('error', (error) => {
      console.error('❌ Failed to start frontend server:', error.message);
    });
  }, 2000);
  
  server.on('close', (code) => {
    console.log(`\n👋 Backend server stopped with code ${code}`);
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start backend server:', error.message);
    process.exit(1);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    server.kill('SIGINT');
    process.exit(0);
  });
} 