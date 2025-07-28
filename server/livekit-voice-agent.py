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


# ────────────────  Assistant prompt (topic & difficulty & context)  ─────────────── #
class ConversationAssistant(Agent):
    def __init__(self, topic: str, difficulty: str, context: str = None, interviewer_role: dict = None):
        context_info = f"\nContext: {context}" if context else ""
        
        # Use interviewer role prompt if available, otherwise use default
        if interviewer_role and interviewer_role.get('prompt'):
            prompt = interviewer_role['prompt']
            if context_info:
                prompt += context_info
        else:
            prompt = (
                f"You are a helpful conversation‑practice partner.\n"
                f"Topic: {topic}\n"
                f"Level: {difficulty}{context_info}\n"
                f"Ask follow‑up questions and give concise, friendly answers."
            )
        
        super().__init__(instructions=prompt)


def create_llm_plugin():
    """Create LLM plugin with fallback options"""
    
    # Check available API keys
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    print(f"🔑 API Keys available:")
    print(f"   OpenRouter: {'✅' if openrouter_key else '❌'}")
    print(f"   OpenAI: {'✅' if openai_key else '❌'}")
    
    # Try OpenRouter first (if available)
    if openrouter_key:
        try:
            print("🔧 Configuring OpenRouter LLM...")
            return openai.LLM(
                model="mistralai/mistral-small-3.2-24b-instruct:free",
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                timeout=30.0,  # Increase timeout
                max_retries=3   # Limit retries
            )
        except Exception as e:
            print(f"⚠️ OpenRouter configuration failed: {e}")
    
    # Fallback to OpenAI (if available)
    if openai_key:
        try:
            print("🔧 Configuring OpenAI LLM...")
            return openai.LLM(
                model="gpt-3.5-turbo",
                api_key=openai_key,
                timeout=30.0,
                max_retries=3
            )
        except Exception as e:
            print(f"⚠️ OpenAI configuration failed: {e}")
    
    # If no API keys available, raise error
    raise Exception("No valid LLM API keys found. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in your .env file.")


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

    # 2️⃣  LLM plugin with fallback options
    try:
        llm_plugin = create_llm_plugin()
        print("✅ LLM plugin configured successfully")
    except Exception as e:
        print(f"❌ Failed to configure LLM: {e}")
        raise e

    # 3️⃣  Build the media session
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=llm_plugin,                            # 👈 enables autopilot
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
            # Optimize for better audio quality
            sample_rate=24000,  # Higher sample rate for better quality
            speed=1.0,          # Normal speed
        ),
        vad=silero.VAD.load(),
        #turn_detection=MultilingualModel(),
    )

    # 4️⃣  Connect to room first
    print("🔗 Connecting to room...")
    await ctx.connect()
    print("✅ Connected to room successfully")
    
    # 5️⃣  Start agent session after connection
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

    # 6️⃣  Autopilot: have the LLM send the first line
    context_mention = f" (context: {context})" if context else ""
    print(f"🎤 Generating welcome message for {topic} session{context_mention}...")
    
    # Check if Cartesia API key is available
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if not cartesia_key:
        print("⚠️ WARNING: CARTESIA_API_KEY not found! TTS will not work.")
    else:
        print("✅ Cartesia API key found")
    
    try:
        print("🔄 Calling session.generate_reply()...")
        
        # Generate the reply and capture the response
        welcome_instructions = f"Welcome the user to their {topic} session{context_mention} and invite them to speak."
        
        # Add interruption instructions for tough interviewer
        if interviewer_role and interviewer_role.get('id') == 'tough':
            welcome_instructions += "\n\nIMPORTANT: You are a tough hiring manager. If the user rambles, uses too many filler words, or takes too long to answer, interrupt them with phrases like 'That's enough, let's move on' or 'You're not answering the question directly'."
        
        response = await session.generate_reply(
            instructions=welcome_instructions
    )
        
        print("✅ Welcome message generated and sent successfully!")
        print(f"📝 Generated response object: {response}")
        
        # Extract the actual text from the response
        if hasattr(response, 'text'):
            print(f"📄 Actual LLM text: {response.text}")
        elif hasattr(response, 'message'):
            print(f"📄 Actual LLM text: {response.message}")
        elif hasattr(response, 'content'):
            print(f"📄 Actual LLM text: {response.content}")
        elif hasattr(response, 'chat_items'):
            # Try to get text from chat items
            chat_items = response.chat_items
            if chat_items and len(chat_items) > 0:
                last_item = chat_items[-1]
                if hasattr(last_item, 'text'):
                    print(f"📄 Actual LLM text: {last_item.text}")
                elif hasattr(last_item, 'message'):
                    print(f"📄 Actual LLM text: {last_item.message}")
                else:
                    print(f"📄 Chat item type: {type(last_item)}")
                    print(f"📄 Chat item attributes: {dir(last_item)}")
            else:
                print("📄 No chat items found")
        else:
            print(f"📄 Response type: {type(response)}")
            print(f"📄 Response attributes: {dir(response)}")
        
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
        # Don't raise the error - let the agent continue running
        print("⚠️ Continuing without welcome message...")
    
    print("🎉 Voice agent is fully ready and waiting for user!")


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
