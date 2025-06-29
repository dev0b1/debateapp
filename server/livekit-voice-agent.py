import os, json, asyncio, logging
from datetime import datetime
from typing import Dict, Any

from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions
from livekit.plugins import deepgram, silero
from openai import OpenAI

# ──────────────────────────────  LOGGING  ────────────────────────────── #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
log = logging.getLogger("conversation_assistant")

# ────────────────────────  SIMPLE OpenRouter LLM  ─────────────────────── #
class OpenRouterLLM:
    def __init__(self, api_key: str):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model = "mistralai/mistral-7b-instruct:free"
        self.headers = {
            "HTTP-Referer": "https://your‑site.com",
            "X-Title": "ConversationAssistant",
        }

    async def chat(self, messages):
        """Return the assistant’s reply text or raise."""
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            extra_headers=self.headers,
            timeout=20,          # don’t hang forever
        )
        return completion.choices[0].message.content

# ─────────────────────────  ASSISTANT AGENT  ─────────────────────────── #
class ConversationAssistant(Agent):
    """A minimal agent that speaks whenever the user finishes a sentence."""

    def __init__(
        self,
        session: AgentSession,
        llm: OpenRouterLLM,
        topic: str = "general conversation",
        difficulty: str = "intermediate",
    ):
        self.session = session
        self.llm = llm
        self.topic = topic
        self.difficulty = difficulty
        self.history = []
        self.started = datetime.now()

        instructions = (
            f"You are an AI conversation practice partner. "
            f"Topic: {topic}. Level: {difficulty}. "
            "Keep answers friendly and concise."
        )
        super().__init__(instructions=instructions)

    # ←←←  THIS is the required callback in livekit‑agents ≥ 1.0  →→→
    async def on_transcription(self, text: str, is_final: bool, **kw):
        log.info(f"🗣  transcription: {text!r}   final={is_final}")
        if not is_final:
            return                              # ignore interim words
        await self._handle_user_utterance(text)

    # ------------------------------------------------------------------- #
    async def _handle_user_utterance(self, user_text: str):
        self.history.append({"role": "user", "content": user_text})

        # 1️⃣ ask the LLM (fallback if it errors)
        try:
            reply = await self.llm.chat(
                [
                    {"role": "system", "content": "You are a helpful partner."},
                    *self.history,
                ]
            )
        except Exception as e:
            log.error(f"LLM error → {e}")
            reply = "Sorry, I had trouble thinking for a moment."

        self.history.append({"role": "assistant", "content": reply})
        log.info(f"🗨️  assistant reply: {reply!r}")

        # 2️⃣ speak it
        await self.session.say(reply)

# ──────────────────────────  ENTRYPOINT  ─────────────────────────────── #
async def entrypoint(ctx: agents.JobContext):
    try:
        meta = json.loads(os.getenv("ROOM_METADATA", "{}"))
        topic = meta.get("topic", "general conversation")
        difficulty = meta.get("difficulty", "intermediate")

        # Create the media session
        session = AgentSession(
            stt=deepgram.STT(model="nova-3"),
            tts=deepgram.TTS(model="aura-asteria-en"),
            vad=silero.VAD.load(),
        )

        llm = OpenRouterLLM(api_key="sk‑openrouter‑xxxxxxxx")  # ← your key
        agent = ConversationAssistant(session=session, llm=llm,
                                      topic=topic, difficulty=difficulty)

        # Start and connect
        await session.start(room=ctx.room, agent=agent,
                            room_input_options=RoomInputOptions())
        await ctx.connect()

        # Welcome line
        await session.say(
            f"Hi! I’m your {topic} practice partner. Feel free to start talking!"
        )

        # Keep the coroutine alive
        while True:
            await asyncio.sleep(1)

    except Exception as e:
        log.exception(f"Fatal: {e}")
        raise

# ────────────────────────────  CLI  ──────────────────────────────────── #
if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
