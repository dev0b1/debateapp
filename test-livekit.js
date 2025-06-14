#!/usr/bin/env node

/**
 * LiveKit Configuration Test Script
 * 
 * This script helps verify that your LiveKit configuration is correct.
 * Run this after setting up your .env file with LiveKit credentials.
 */

import { config } from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

// Load environment variables
config();

console.log('🔍 Testing LiveKit Configuration...\n');

// Check if environment variables are set
const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

console.log('📋 Environment Variables Check:');
console.log(`   LIVEKIT_URL: ${livekitUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   LIVEKIT_API_KEY: ${livekitApiKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   LIVEKIT_API_SECRET: ${livekitApiSecret ? '✅ Set' : '❌ Missing'}`);

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  console.log('\n❌ Missing required LiveKit environment variables!');
  console.log('   Please check your .env file and ensure all LiveKit credentials are set.');
  process.exit(1);
}

// Check for placeholder values
if (livekitUrl.includes('your_') || livekitApiKey.includes('your_') || livekitApiSecret.includes('your_')) {
  console.log('\n⚠️  Placeholder values detected!');
  console.log('   Please replace the placeholder values in your .env file with actual LiveKit credentials.');
  process.exit(1);
}

console.log('\n✅ All environment variables are set correctly!');

// Test token generation
try {
  console.log('\n🔑 Testing Token Generation:');
  
  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: "test-user",
    name: "Test User",
  });

  token.addGrant({
    roomJoin: true,
    room: "test-room",
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();
  console.log('   ✅ Token generation successful');
  console.log(`   Token length: ${jwt.length} characters`);
  
} catch (error) {
  console.log('   ❌ Token generation failed');
  console.log(`   Error: ${error.message}`);
  process.exit(1);
}

// Test WebSocket URL format
console.log('\n🌐 Testing WebSocket URL Format:');
try {
  const url = new URL(livekitUrl);
  if (url.protocol === 'wss:' || url.protocol === 'ws:') {
    console.log('   ✅ WebSocket URL format is correct');
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
  } else {
    console.log('   ❌ Invalid WebSocket URL format');
    console.log('   URL should start with wss:// or ws://');
  }
} catch (error) {
  console.log('   ❌ Invalid URL format');
  console.log(`   Error: ${error.message}`);
}

// Test API key format
console.log('\n🔑 Testing API Key Format:');
if (livekitApiKey.startsWith('APIn') || livekitApiKey.startsWith('API')) {
  console.log('   ✅ API Key format looks correct');
} else {
  console.log('   ⚠️  API Key format may be incorrect');
  console.log('   LiveKit API keys typically start with "APIn" or "API"');
}

// Test API secret format
console.log('\n🔐 Testing API Secret Format:');
if (livekitApiSecret.startsWith('secret') && livekitApiSecret.length > 20) {
  console.log('   ✅ API Secret format looks correct');
} else {
  console.log('   ⚠️  API Secret format may be incorrect');
  console.log('   LiveKit API secrets typically start with "secret" and are longer than 20 characters');
}

console.log('\n🎉 LiveKit Configuration Test Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Start your server: npm run dev');
console.log('2. Test the connection: curl http://localhost:5000/api/test/livekit-status');
console.log('3. Try creating a conversation room through the web interface');

console.log('\n📚 For more information, see LIVEKIT_SETUP.md'); 