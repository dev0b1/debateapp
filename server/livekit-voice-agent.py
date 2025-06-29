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
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()          # pulls environment variables from .env


# ────────────────  Assistant prompt (topic & difficulty)  ─────────────── #
class ConversationAssistant(Agent):
    def __init__(self, topic: str, difficulty: str):
        prompt = (
            f"You are a helpful conversation‑practice partner.\n"
            f"Topic: {topic}\n"
            f"Level: {difficulty}\n"
            f"Ask follow‑up questions and give concise, friendly answers."
        )
        super().__init__(instructions=prompt)


# ─────────────────────────────  Entrypoint  ───────────────────────────── #
async def entrypoint(ctx: agents.JobContext):
    # 1️⃣  Metadata injected by your Node backend
    meta = json.loads(os.getenv("ROOM_METADATA", "{}"))
    topic = meta.get("topic", "general conversation")
    difficulty = meta.get("difficulty", "intermediate")

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

    # 4️⃣  Start & connect
    await session.start(
        room=ctx.room,
        agent=ConversationAssistant(topic, difficulty),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )
    await ctx.connect()

    # 5️⃣  Autopilot: have the LLM send the first line
    await session.generate_reply(
        instructions=f"Welcome the user to their {topic} session and invite them to speak."
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
