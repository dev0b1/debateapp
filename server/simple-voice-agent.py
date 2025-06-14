#!/usr/bin/env python3

import asyncio
import os
import json
import websockets
import logging
from typing import Dict, Any, List
from dotenv import load_dotenv
from openai import OpenAI
from deepgram import Deepgram

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleVoiceAgent:
    def __init__(self, topic: str = "general conversation", difficulty: str = "intermediate"):
        self.topic = topic
        self.difficulty = difficulty
        self.conversation_history = []
        
        # Initialize APIs
        self.openai_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
        
        self.deepgram_client = Deepgram(os.getenv("DEEPGRAM_API_KEY"))
        
        # Conversation context
        self.system_prompt = f"""You are a helpful AI conversation practice assistant specializing in {topic} conversations.
        
        Difficulty level: {difficulty}
        
        Your role is to:
        1. Engage in natural conversation about {topic}
        2. Ask follow-up questions to keep the conversation flowing
        3. Provide gentle feedback and encouragement
        4. Help the user practice their communication skills
        
        Keep responses conversational and natural, as if you're talking to a friend."""
    
    async def generate_response(self, user_message: str) -> str:
        """Generate a response using OpenRouter"""
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Prepare messages for the API
            messages = [{"role": "system", "content": self.system_prompt}] + self.conversation_history[-10:]  # Keep last 10 messages for context
            
            response = self.openai_client.chat.completions.create(
                model="deepseek/deepseek-chat-v3-0324:free",
                messages=messages,
                max_tokens=150,
                temperature=0.7,
            )
            
            ai_response = response.choices[0].message.content
            
            # Add AI response to history
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I'm having trouble processing that right now. Could you please repeat or rephrase your question?"
    
    async def text_to_speech(self, text: str) -> bytes:
        """Convert text to speech using Deepgram"""
        try:
            response = await self.deepgram_client.speak.v("1", {
                "text": text
            }, {
                "model": "aura-asteria-en",
                "voice": "nova"
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error in text-to-speech: {e}")
            return b""  # Return empty audio
    
    async def speech_to_text(self, audio_data: bytes) -> str:
        """Convert speech to text using Deepgram"""
        try:
            response = await self.deepgram_client.transcription.prerecorded({
                "buffer": audio_data,
                "mimetype": "audio/wav"
            }, {
                "model": "nova-2",
                "language": "en",
                "smart_format": True
            })
            
            return response["results"]["channels"][0]["alternatives"][0]["transcript"]
            
        except Exception as e:
            logger.error(f"Error in speech-to-text: {e}")
            return ""

async def main():
    """Main function for testing the simple voice agent"""
    print("=== Simple Voice Agent Test ===")
    
    # Check environment variables
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    print(f"Deepgram API key: {'SET' if deepgram_key else 'NOT SET'}")
    print(f"OpenRouter API key: {'SET' if openrouter_key else 'NOT SET'}")
    
    if not deepgram_key or not openrouter_key:
        print("❌ Missing required API keys")
        return
    
    # Create agent
    agent = SimpleVoiceAgent(topic="job interview", difficulty="intermediate")
    
    # Test conversation
    print("\n=== Testing Conversation ===")
    
    test_messages = [
        "Hello, I'm here to practice for a job interview.",
        "I'm applying for a software developer position.",
        "I have 3 years of experience in Python and JavaScript."
    ]
    
    for message in test_messages:
        print(f"\nUser: {message}")
        response = await agent.generate_response(message)
        print(f"AI: {response}")
    
    print("\n✅ Simple voice agent test completed successfully!")

if __name__ == "__main__":
    asyncio.run(main()) 