#!/usr/bin/env python3
"""
Test script to verify API keys and diagnose LLM provider issues
"""

import os
import asyncio
from dotenv import load_dotenv
import openai

load_dotenv()

async def test_openrouter():
    """Test OpenRouter API"""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("❌ OPENROUTER_API_KEY not found")
        return False
    
    print("🔧 Testing OpenRouter API...")
    
    try:
        client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        response = await client.chat.completions.create(
            model="mistralai/mistral-small-3.2-24b-instruct:free",
            messages=[{"role": "user", "content": "Hello, this is a test message."}],
            max_tokens=50,
            timeout=30.0
        )
        
        print("✅ OpenRouter API test successful!")
        print(f"📝 Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"❌ OpenRouter API test failed: {e}")
        return False

async def test_openai():
    """Test OpenAI API"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found")
        return False
    
    print("🔧 Testing OpenAI API...")
    
    try:
        client = openai.AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello, this is a test message."}],
            max_tokens=50,
            timeout=30.0
        )
        
        print("✅ OpenAI API test successful!")
        print(f"📝 Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API test failed: {e}")
        return False

async def test_deepgram():
    """Test Deepgram API"""
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ DEEPGRAM_API_KEY not found")
        return False
    
    print("🔧 Testing Deepgram API...")
    
    try:
        import requests
        
        url = "https://api.deepgram.com/v1/listen"
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "audio/wav"
        }
        
        # Create a simple test audio file (silence)
        import wave
        import struct
        
        # Create a simple WAV file with 1 second of silence
        with wave.open("test_audio.wav", "w") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            wav_file.writeframes(struct.pack('<h', 0) * 16000)
        
        with open("test_audio.wav", "rb") as audio_file:
            response = requests.post(url, headers=headers, data=audio_file)
        
        if response.status_code == 200:
            print("✅ Deepgram API test successful!")
            return True
        else:
            print(f"❌ Deepgram API test failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Deepgram API test failed: {e}")
        return False
    finally:
        # Clean up test file
        if os.path.exists("test_audio.wav"):
            os.remove("test_audio.wav")

async def test_cartesia():
    """Test Cartesia API"""
    api_key = os.getenv("CARTESIA_API_KEY")
    if not api_key:
        print("❌ CARTESIA_API_KEY not found")
        return False
    
    print("🔧 Testing Cartesia API...")
    
    try:
        import requests
        
        url = "https://api.cartesia.ai/v1/audio/generations"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "text": "Hello, this is a test.",
            "model": "sonic-2",
            "voice": "f786b574-daa5-4673-aa0c-cbe3e8534c02"
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            print("✅ Cartesia API test successful!")
            return True
        else:
            print(f"❌ Cartesia API test failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Cartesia API test failed: {e}")
        return False

async def main():
    """Run all API tests"""
    print("🔍 Testing API Keys and Services...")
    print("=" * 50)
    
    # Check environment variables
    print("📋 Environment Variables:")
    print(f"   OPENROUTER_API_KEY: {'✅' if os.getenv('OPENROUTER_API_KEY') else '❌'}")
    print(f"   OPENAI_API_KEY: {'✅' if os.getenv('OPENAI_API_KEY') else '❌'}")
    print(f"   DEEPGRAM_API_KEY: {'✅' if os.getenv('DEEPGRAM_API_KEY') else '❌'}")
    print(f"   CARTESIA_API_KEY: {'✅' if os.getenv('CARTESIA_API_KEY') else '❌'}")
    print()
    
    # Test each service
    results = {}
    
    results['openrouter'] = await test_openrouter()
    print()
    
    results['openai'] = await test_openai()
    print()
    
    results['deepgram'] = await test_deepgram()
    print()
    
    results['cartesia'] = await test_cartesia()
    print()
    
    # Summary
    print("=" * 50)
    print("📊 Test Results Summary:")
    for service, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {service.upper()}: {status}")
    
    # Recommendations
    print("\n💡 Recommendations:")
    if not results['openrouter'] and not results['openai']:
        print("   - You need at least one LLM provider (OpenRouter or OpenAI)")
        print("   - Get OpenRouter key from: https://openrouter.ai/keys")
        print("   - Get OpenAI key from: https://platform.openai.com/api-keys")
    
    if not results['deepgram']:
        print("   - Deepgram is required for speech-to-text")
        print("   - Get Deepgram key from: https://console.deepgram.com/")
    
    if not results['cartesia']:
        print("   - Cartesia is required for text-to-speech")
        print("   - Get Cartesia key from: https://cartesia.ai/")

if __name__ == "__main__":
    asyncio.run(main()) 