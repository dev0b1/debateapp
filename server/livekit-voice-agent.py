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
    def __init__(self, topic: str, difficulty: str, context: str = None):
        context_info = f"\nContext: {context}" if context else ""
        prompt = (
            f"You are a helpful conversation‑practice partner.\n"
            f"Topic: {topic}\n"
            f"Level: {difficulty}{context_info}\n"
            f"Ask follow‑up questions and give concise, friendly answers."
        )
        super().__init__(instructions=prompt)


# ─────────────────────────────  Entrypoint  ───────────────────────────── #
async def entrypoint(ctx: agents.JobContext):
    print(f"🎯 Starting voice agent for room: {ctx.room.name}")
    
    # 1️⃣  Metadata injected by your Node backend
    meta = json.loads(os.getenv("ROOM_METADATA", "{}"))
    topic = meta.get("topic", "general conversation")
    difficulty = meta.get("difficulty", "intermediate")
    context = meta.get("context", None)
    
    print(f"📋 Topic: {topic}")
    print(f"📊 Difficulty: {difficulty}")
    print(f"📝 Context: {context}")

    # 2️⃣  LLM plugin → OpenRouter, Gemini‑pro
    llm_plugin = openai.LLM(
        model="mistralai/mistral-small-3.2-24b-instruct:free",                 # Gemini via OpenRouter
        base_url="https://openrouter.ai/api/v1",   # put in .env
        # OpenRouter asks for these two headers:
        api_key=os.getenv("OPENROUTER_API_KEY")
        
    )

    # 3️⃣  Build the media session
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=llm_plugin,                            # 👈 enables autopilot
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
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
        agent=ConversationAssistant(topic, difficulty, context),
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
        response = await session.generate_reply(
            instructions=f"Welcome the user to their {topic} session{context_mention} and invite them to speak."
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
        raise e
    
    print("🎉 Voice agent is fully ready and waiting for user!")


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
