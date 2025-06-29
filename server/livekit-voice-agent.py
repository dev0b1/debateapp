"""
voice_agent_autopilot.py
Compatible with livekit-agents >= 1.0.0
"""

import os, json
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions
from livekit.plugins import (
    deepgram,
    cartesia,
    silero,
    noise_cancellation,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.plugins.openai import LLM as OpenAILLM

load_dotenv()                               # pulls .env into os.environ


# ──────────────────────────  Assistant class  ─────────────────────────── #
class Assistant(Agent):
    def __init__(self, topic: str, difficulty: str) -> None:
        system_prompt = (
            f"You are a helpful conversation‑practice partner. "
            f"Topic: {topic}. Level: {difficulty}. "
            "Keep answers friendly, concise, and encourage the user to speak."
        )
        super().__init__(instructions=system_prompt)


# ─────────────────────────────  Entrypoint  ───────────────────────────── #
async def entrypoint(ctx: agents.JobContext):
    # 1️⃣  Bring back the metadata you send from Node/Express
    meta = json.loads(os.getenv("ROOM_METADATA", "{}"))
    topic = meta.get("topic", "general conversation")
    difficulty = meta.get("difficulty", "intermediate")

    # 2️⃣  Pick an LLM backend (OpenRouter if its key is set, else OpenAI)
    if os.getenv("OPENROUTER_API_KEY"):
        llm_plugin = OpenAILLM(
            model="mistralai/mistral-7b-instruct:free",
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
            extra_headers={
                "HTTP-Referer": "https://your-site.com",
                "X-Title": "ConfidenceCompass",
            },
        )
    else:
        llm_plugin = OpenAILLM(model="gpt-4o-mini")  # needs OPENAI_API_KEY

    # 3️⃣  Build the session ― llm=… enables autopilot
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=llm_plugin,                         # 👈 autopilot on
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    # 4️⃣  Start the media pipeline
    await session.start(
        room=ctx.room,
        agent=Assistant(topic, difficulty),     # just supplies the prompt
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),  # LK Cloud DSP
        ),
    )

    await ctx.connect()

    # 5️⃣  Let autopilot generate the opening line
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


# ────────────────────────────  Worker CLI  ────────────────────────────── #
if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
