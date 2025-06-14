import asyncio
import os
import json
import time
from typing import Dict, Any, List, AsyncGenerator
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import deepgram, silero

from openai import OpenAI

# Load environment variables
load_dotenv()

# Debug: Print all environment variables (excluding sensitive values)
print("\n=== Environment Variables Check ===")
env_vars = {
    "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
    "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
    "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
    "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
    "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY")
}

for key, value in env_vars.items():
    if value:
        masked_value = value[:4] + "..." + value[-4:] if len(value) > 8 else "***"
        print(f"{key}: {masked_value}")
    else:
        print(f"{key}: NOT SET")

print("================================\n")

# --- Custom LLM Wrapper for OpenRouter ---
class OpenRouterLLM:
    def __init__(self, model: str = "deepseek/deepseek-chat-v3-0324:free", temperature: float = 0.7):
        api_key = os.getenv("OPENROUTER_API_KEY")
        print(f"\n=== OpenRouter LLM Initialization ===")
        print(f"API Key present: {'Yes' if api_key else 'No'}")
        print(f"API Key length: {len(api_key) if api_key else 0}")
        
        if not api_key or api_key == "your_openrouter_api_key_here":
            print("Warning: OpenRouter API key not configured. Using fallback mode.")
            self.client = None
            self.fallback_mode = True
        else:
            print("OpenRouter API key configured. Initializing client...")
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
            )
            self.fallback_mode = False
        
        self.model = model
        self.temperature = temperature
        print("================================\n")

    async def chat(self, chat_ctx, conn_options=None, fnc_ctx=None, tools=None, tool_choice=None):
        """Simple chat method that yields chunks directly"""
        if self.fallback_mode:
            # Fallback response when API is not available
            fallback_content = "I'm currently in demo mode. In a full setup, I would respond to your conversation here. Please configure your API keys to enable full functionality."
            fallback_msg = type('obj', (object,), {
                'role': 'assistant',
                'content': fallback_content
            })
            chat_ctx.messages.append(fallback_msg)
            yield fallback_content
            return

        try:
            # Convert chat context to messages
            messages = []
            for msg in chat_ctx.messages:
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Add system message if not present
            if not any(msg["role"] == "system" for msg in messages):
                messages.insert(0, {
                    "role": "system",
                    "content": "You are a helpful AI conversation partner for public speaking practice."
                })

            # Create streaming response
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                messages=messages,
                stream=True,
                extra_headers={
                    "HTTP-Referer": "https://yourapp.com",
                    "X-Title": "LiveKitAI-Agent",
                }
            )

            full_content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    yield content

            # Add final response to chat context
            if full_content:
                # Create a simple message object
                response_msg = type('obj', (object,), {
                    'role': 'assistant',
                    'content': full_content
                })
                chat_ctx.messages.append(response_msg)

        except Exception as e:
            print(f"Error in OpenRouter chat: {e}")
            # Fallback response
            fallback_content = "I'm having trouble processing that right now. Could you please repeat or rephrase your question?"
            fallback_msg = type('obj', (object,), {
                'role': 'assistant',
                'content': fallback_content
            })
            chat_ctx.messages.append(fallback_msg)
            yield fallback_content

    async def generate(self, prompt: str, history: List[Dict[str, str]] = None) -> str:
        """Generate a single response (for compatibility)"""
        if self.fallback_mode:
            return "Demo mode: Configure API keys for full functionality."
        
        messages = history if history else []
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            messages=messages,
            extra_headers={
                "HTTP-Referer": "https://yourapp.com",
                "X-Title": "LiveKitAI-Agent",
            }
        )
        return response.choices[0].message.content


# --- Conversation Practice Assistant Agent ---
class ConversationPracticeAssistant(Agent):
    def __init__(self, topic: str = "general conversation", difficulty: str = "intermediate") -> None:
        self.topic = topic
        self.difficulty = difficulty
        
        instructions = self._generate_instructions(topic, difficulty)
        super().__init__(instructions=instructions)
        
        self.conversation_history = []
        self.feedback_points = []
        self.session_metrics = {
            "speaking_time": 0,
            "response_count": 0,
            "avg_response_time": 0,
            "vocabulary_complexity": 0,
            "user_engagement": 0,
            "conversation_flow": 0
        }

    def _generate_instructions(self, topic: str, difficulty: str) -> str:
        base_instructions = f"""
        You are a helpful AI conversation practice assistant specializing in {topic} conversations.
        ...
        """
        if difficulty == "beginner":
            base_instructions += "\n- Use simple vocabulary and clear speech"
        elif difficulty == "advanced":
            base_instructions += "\n- Use complex vocabulary and advanced discussion points"
        return base_instructions

    async def on_message_received(self, message: str) -> None:
        self.conversation_history.append({
            "speaker": "user",
            "message": message,
            "timestamp": asyncio.get_event_loop().time()
        })
        feedback = self._analyze_user_message(message)
        if feedback:
            self.feedback_points.append(feedback)

    def _analyze_user_message(self, message: str) -> Dict[str, Any] | None:
        feedback = {}
        filler_words = ["um", "uh", "like", "you know"]
        filler_count = sum(1 for word in filler_words if word in message.lower())
        if filler_count:
            feedback["filler_words"] = {
                "count": filler_count,
                "suggestion": "Try to reduce filler words."
            }
        if len(message.split()) < 5:
            feedback["elaboration"] = {"suggestion": "Try to elaborate more."}
        return feedback if feedback else None


# --- Entrypoint for LiveKit Agent ---
async def entrypoint(ctx: agents.JobContext):
    try:
        metadata = json.loads(ctx.room.metadata or "{}")
        topic = metadata.get("topic", "general conversation")
        difficulty = metadata.get("difficulty", "intermediate")
    except:
        topic = "general conversation"
        difficulty = "intermediate"
    
    print(f"\n=== Starting Conversation Practice Agent ===")
    print(f"Topic: {topic}")
    print(f"Difficulty: {difficulty}")

    # Check if Deepgram API key is available
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    
    print(f"\nAPI Keys Status:")
    print(f"Deepgram API key: {'SET' if deepgram_api_key else 'NOT SET'}")
    print(f"OpenRouter API key: {'SET' if openrouter_api_key else 'NOT SET'}")
    
    if not deepgram_api_key or deepgram_api_key == "your_deepgram_api_key_here":
        print("\nWarning: Deepgram API key not configured. Voice features will be limited.")
        # Create a minimal session without STT/TTS
        session = AgentSession(
            llm=OpenRouterLLM(model="deepseek/deepseek-chat-v3-0324:free", temperature=0.7),
            vad=silero.VAD.load(),
        )
    else:
        # Full session with STT/TTS - add retry logic
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                print(f"\nAttempting to create full session with STT/TTS (attempt {retry_count + 1}/{max_retries})")
                session = AgentSession(
                    stt=deepgram.STT(model="nova-2", language="en"),
                    llm=OpenRouterLLM(model="deepseek/deepseek-chat-v3-0324:free", temperature=0.7),
                    tts=deepgram.TTS(model="aura-asteria-en"),
                    vad=silero.VAD.load(),
                )
                print("Full session created successfully")
                break
            except Exception as e:
                retry_count += 1
                print(f"Failed to create full session (attempt {retry_count}/{max_retries}): {e}")
                if retry_count >= max_retries:
                    print("Falling back to minimal session without STT/TTS")
                    session = AgentSession(
                        llm=OpenRouterLLM(model="deepseek/deepseek-chat-v3-0324:free", temperature=0.7),
                        vad=silero.VAD.load(),
                    )
                else:
                    print(f"Retrying in 2 seconds...")
                    await asyncio.sleep(2)

    assistant = ConversationPracticeAssistant(topic, difficulty)

    try:
        print("\nStarting session...")
        # Configure room input options with audio settings
        room_input_options = RoomInputOptions(
            audio=True,  # Enable audio input
            video=False,  # Disable video input
            data=True,   # Enable data channel for messages
        )
        
        await session.start(
            room=ctx.room,
            agent=assistant,
            room_input_options=room_input_options,
        )

        await ctx.connect()
        print("Connected to LiveKit room")

        # Subscribe to room events for audio monitoring
        ctx.room.on("track_subscribed", lambda track, publication, participant: 
            print(f"Track subscribed: {track.kind} from {participant.identity}")
        )
        ctx.room.on("track_unsubscribed", lambda track, publication, participant: 
            print(f"Track unsubscribed: {track.kind} from {participant.identity}")
        )

        # Generate initial greeting using LiveKit's built-in method
        greeting = f"Hello! I'm here to help you practice {topic} conversations. How do you feel about this topic today?"
        print(f"\nSending initial greeting: {greeting}")
        await session.generate_reply(instructions=greeting)

        # Keep session alive and handle conversation flow
        while ctx.room.connection_state == "connected":
            await asyncio.sleep(1)
            
            # Provide periodic feedback during longer conversations
            if assistant.conversation_history:
                last_message_time = assistant.conversation_history[-1]["timestamp"]
                current_time = asyncio.get_event_loop().time()
                
                # If no activity for 30 seconds, prompt for continuation
                if current_time - last_message_time > 30:
                    await session.generate_reply(
                        instructions="The user seems to have paused. Gently encourage them to continue the conversation with a follow-up question."
                    )
    except Exception as e:
        print(f"Error in voice agent session: {e}")
        # Try to provide a graceful fallback
        try:
            await session.generate_reply(
                instructions="I'm experiencing some technical difficulties. Please try again in a moment."
            )
        except:
            pass
        raise


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
