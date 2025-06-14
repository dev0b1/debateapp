#!/usr/bin/env python3

import asyncio
import os
from dotenv import load_dotenv
from livekit.plugins import deepgram

load_dotenv()

async def test_deepgram_connection():
    """Test Deepgram connection outside of LiveKit agent context"""
    
    print("Testing Deepgram connection...")
    
    # Check environment variables
    api_key = os.getenv("DEEPGRAM_API_KEY")
    print(f"Deepgram API key: {'SET' if api_key else 'NOT SET'}")
    
    if not api_key:
        print("No Deepgram API key found")
        return False
    
    try:
        print("Creating Deepgram STT instance...")
        stt = deepgram.STT(model="nova-2", language="en")
        print("Deepgram STT instance created successfully")
        
        print("Creating Deepgram TTS instance...")
        tts = deepgram.TTS(model="aura-asteria-en")
        print("Deepgram TTS instance created successfully")
        
        print("✅ Deepgram connection test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Deepgram connection test failed: {e}")
        print(f"Error type: {type(e)}")
        return False

async def test_openrouter_connection():
    """Test OpenRouter connection"""
    
    print("\nTesting OpenRouter connection...")
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    print(f"OpenRouter API key: {'SET' if api_key else 'NOT SET'}")
    
    if not api_key:
        print("No OpenRouter API key found")
        return False
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        
        # Simple test request
        response = client.chat.completions.create(
            model="deepseek/deepseek-chat-v3-0324:free",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        print("✅ OpenRouter connection test passed!")
        return True
        
    except Exception as e:
        print(f"❌ OpenRouter connection test failed: {e}")
        return False

async def main():
    """Run all connection tests"""
    
    print("=== Connection Tests ===")
    
    # Test Deepgram
    deepgram_ok = await test_deepgram_connection()
    
    # Test OpenRouter
    openrouter_ok = await test_openrouter_connection()
    
    print(f"\n=== Summary ===")
    print(f"Deepgram: {'✅ PASS' if deepgram_ok else '❌ FAIL'}")
    print(f"OpenRouter: {'✅ PASS' if openrouter_ok else '❌ FAIL'}")
    
    if deepgram_ok and openrouter_ok:
        print("\n🎉 All tests passed! The issue might be specific to the LiveKit agent context.")
    else:
        print("\n⚠️  Some tests failed. Check your API keys and network connection.")

if __name__ == "__main__":
    asyncio.run(main()) 