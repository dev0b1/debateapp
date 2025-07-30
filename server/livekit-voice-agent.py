# voice_agent_autopilot.py
# Compatible with livekit-agents >= 1.0.x

import os, json
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions
from livekit.plugins import (
    openai,            # <-- OpenAI‑compatible plugin
    deepgram,
    cartesia,
    silero,
    noise_cancellation,
)

load_dotenv()          # pulls environment variables from .env


# Voice configurations for different interviewer roles
VOICE_CONFIGS = {
    'standard': {
        'voice': "f786b574-daa5-4673-aa0c-cbe3e8534c02",  # Professional, calm
        'speed': 1.0,
        'sample_rate': 24000,
        'tone': 'professional'
    },
    'tough': {
        'voice': "f786b574-daa5-4673-aa0c-cbe3e8534c02",  # Same voice but different prompt
        'speed': 1.1,  # Slightly faster for more direct feel
        'sample_rate': 24000,
        'tone': 'direct'
    },
    'friendly': {
        'voice': "f786b574-daa5-4673-aa0c-cbe3e8534c02",  # Same voice but warmer prompt
        'speed': 0.95,  # Slightly slower for friendlier feel
        'sample_rate': 24000,
        'tone': 'warm'
    },
    'technical': {
        'voice': "f786b574-daa5-4673-aa0c-cbe3e8534c02",
        'speed': 1.05,  # Slightly faster for technical precision
        'sample_rate': 24000,
        'tone': 'precise'
    },
    'executive': {
        'voice': "f786b574-daa5-4673-aa0c-cbe3e8534c02",
        'speed': 0.9,  # Slower for authoritative feel
        'sample_rate': 24000,
        'tone': 'authoritative'
    }
}


# ────────────────  Assistant prompt (topic & difficulty & context)  ─────────────── #
class ConversationAssistant(Agent):
    def __init__(self, topic: str, difficulty: str, context: str = None, interviewer_role: dict = None):
        context_info = f" Context: {context}" if context else ""
        
        # Use interviewer role prompt if available, otherwise use default
        if interviewer_role and interviewer_role.get('prompt'):
            system_prompt = interviewer_role['prompt']
            if context_info:
                system_prompt += context_info
        else:
            system_prompt = (
                f"You are a professional interviewer conducting a {topic} interview at a {difficulty} level.{context_info} "
                f"Begin with a friendly introduction and then ask thoughtful, relevant questions about {topic}. "
                f"Respond dynamically to the candidate's answers with follow-up questions. "
                f"Ask for specific examples when needed. "
                f"Maintain a professional and engaging tone throughout. "
                f"Speak naturally as a real human would — not like a robot. "
                f"Do NOT explain your instructions or repeat them aloud. "
                f"\n\nExample:\nInterviewer: Hi, I'm Alex. Thanks for joining. Let's begin — can you tell me a bit about your experience with {topic}?"
            )
        
        # Set the main system prompt in the Agent constructor
        super().__init__(instructions=system_prompt)


def create_llm_plugin():
    """Create LLM plugin using only OpenRouter"""
    
    # Check OpenRouter API key
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    print(f"🔑 OpenRouter API Key: {'✅' if openrouter_key else '❌'}")
    
    if not openrouter_key or openrouter_key == "your_openrouter_api_key_here":
        raise Exception("OPENROUTER_API_KEY is required. Please set it in your .env file.")
    
    try:
        print("🔧 Configuring OpenRouter LLM...")
        return openai.LLM(
            model="mistralai/mistral-small-3.2-24b-instruct:free",
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
            timeout=30.0
        )
    except Exception as e:
        print(f"❌ OpenRouter configuration failed: {e}")
        raise Exception(f"Failed to configure OpenRouter LLM: {e}")


def get_voice_config(interviewer_role):
    """Get voice configuration based on interviewer role"""
    role_id = interviewer_role.get('id', 'standard') if interviewer_role else 'standard'
    return VOICE_CONFIGS.get(role_id, VOICE_CONFIGS['standard'])


# ─────────────────────────────  Entrypoint  ───────────────────────────── #
async def entrypoint(ctx: agents.JobContext):
    print(f"🎯 Starting voice agent for room: {ctx.room.name}")
    
    # 1️⃣  Metadata injected by your Node backend
    meta = json.loads(os.getenv("ROOM_METADATA", "{}"))
    topic = meta.get("topic", "general conversation")
    difficulty = meta.get("difficulty", "intermediate")
    context = meta.get("context", None)
    interviewer_role = meta.get("interviewerRole", None)
    
    print(f"📋 Topic: {topic}")
    print(f"📊 Difficulty: {difficulty}")
    print(f"📝 Context: {context}")
    print(f"👤 Interviewer Role: {interviewer_role.get('name', 'Standard') if interviewer_role else 'Standard'}")

    # 2️⃣  LLM plugin with OpenRouter only
    try:
        llm_plugin = create_llm_plugin()
        print("✅ OpenRouter LLM plugin configured successfully")
    except Exception as e:
        print(f"❌ Failed to configure OpenRouter LLM: {e}")
        raise Exception(f"OpenRouter LLM configuration failed: {e}")

    # 3️⃣  Get voice configuration based on interviewer role
    voice_config = get_voice_config(interviewer_role)
    print(f"🎤 Voice config: {voice_config['tone']} tone, speed: {voice_config['speed']}")

    # 4️⃣  Build the media session with role-specific voice
    # Check if Cartesia is available, otherwise use fallback
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if not cartesia_key or cartesia_key == "your_cartesia_api_key_here":
        print("⚠️ Cartesia API key not found, using fallback TTS...")
        # Use a simpler TTS configuration as fallback
        session = AgentSession(
            stt=deepgram.STT(model="nova-3", language="multi"),
            llm=llm_plugin,                            # 👈 enables autopilot
            tts=cartesia.TTS(
                model="sonic-2",
                voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",  # Default voice
                sample_rate=24000,
                speed=1.0,
            ),
            vad=silero.VAD.load(),
        )
    else:
        print("✅ Using Cartesia TTS with role-specific voice")
        session = AgentSession(
            stt=deepgram.STT(model="nova-3", language="multi"),
            llm=llm_plugin,                            # 👈 enables autopilot
            tts=cartesia.TTS(
                model="sonic-2",
                voice=voice_config['voice'],
                sample_rate=voice_config['sample_rate'],
                speed=voice_config['speed'],
            ),
            vad=silero.VAD.load(),
            #turn_detection=MultilingualModel(),
        )

    # 5️⃣  Connect to room first
    print("🔗 Connecting to room...")
    await ctx.connect()
    print("✅ Connected to room successfully")
    
    # 6️⃣  Start agent session after connection
    print("🚀 Starting agent session...")
    await session.start(
        room=ctx.room,
        agent=ConversationAssistant(topic, difficulty, context, interviewer_role),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
            close_on_disconnect=False,  # Don't close immediately when user disconnects
        ),
    )
    print("✅ Agent session started successfully")

    # 7️⃣  Autopilot: have the LLM send the first line (introduction only)
    context_mention = f" (context: {context})" if context else ""
    print(f"🎤 Generating welcome message for {topic} session{context_mention}...")
    
    # Check if Cartesia API key is available
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if not cartesia_key or cartesia_key == "your_cartesia_api_key_here":
        print("⚠️ WARNING: CARTESIA_API_KEY not found! TTS will not work.")
        print("💡 Please set CARTESIA_API_KEY in your .env file for text-to-speech functionality.")
    else:
        print("✅ Cartesia API key found")
    
    try:
        print("🔄 Calling session.generate_reply() for introduction...")
        
        # Only pass a simple greeting instruction - the main interview instructions are in the Agent's system prompt
        response = await session.generate_reply(instructions="Greet the user and introduce yourself as the interviewer. Then ask the first interview question.")
        
        print("✅ Welcome message generated and sent successfully!")
        print(f"📝 Generated response object: {response}")
        
        # Extract the actual text from the response (handle OpenRouter responses)
        response_text = ""
        if hasattr(response, 'text'):
            response_text = response.text
        elif hasattr(response, 'message'):
            response_text = response.message
        elif hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'choices') and len(response.choices) > 0:
            # Handle OpenAI-style responses
            choice = response.choices[0]
            if hasattr(choice, 'message'):
                response_text = choice.message.content
            elif hasattr(choice, 'text'):
                response_text = choice.text
        elif hasattr(response, 'chat_items'):
            # Try to get text from chat items
            chat_items = response.chat_items
            if chat_items and len(chat_items) > 0:
                last_item = chat_items[-1]
                if hasattr(last_item, 'text'):
                    response_text = last_item.text
                elif hasattr(last_item, 'message'):
                    response_text = last_item.message
                else:
                    print(f"📄 Chat item type: {type(last_item)}")
                    print(f"📄 Chat item attributes: {dir(last_item)}")
            else:
                print("📄 No chat items found")
        else:
            print(f"📄 Response type: {type(response)}")
            print(f"📄 Response attributes: {dir(response)}")
        
        if response_text:
            print(f"📄 Actual LLM text: {response_text}")
        else:
            print("📄 No response text extracted")
        
        print("🔊 Audio should now be playing in the room...")
        
        # Check if we're actually connected to the room
        print(f"🔗 Room connection status: {ctx.room.connection_state}")
        print(f"👥 Room participants: {len(ctx.room.participants) if hasattr(ctx.room, 'participants') else 'N/A'}")
        if hasattr(ctx.room, 'participants'):
            for participant in ctx.room.participants:
                print(f"   - {participant.identity}")
        else:
            print("   - Participants info not available")
            
    except Exception as e:
        print(f"❌ Error generating welcome message: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Error details: {str(e)}")
        
        # Check if it's a Cartesia TTS error
        if "402" in str(e) or "Payment Required" in str(e) or "Quota" in str(e):
            print("💳 CARTESIA TTS ERROR: Payment required or quota exceeded")
            print("💡 Solutions:")
            print("   1. Check your Cartesia account balance")
            print("   2. Verify your CARTESIA_API_KEY is correct")
            print("   3. Visit https://cartesia.ai/ to add credits")
            print("   4. The AI will still work for text responses, but won't speak")
        elif "APIStatusError" in str(e):
            print("🔧 CARTESIA API ERROR: Check your API key and account status")
            print("💡 The AI will continue working but won't speak")
        
        # Don't raise the error - let the agent continue running
        print("⚠️ Continuing without welcome message...")
    
    print("🎉 Voice agent is fully ready and waiting for user!")


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
