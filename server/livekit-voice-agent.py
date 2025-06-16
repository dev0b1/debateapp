import os
import sys
import json
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    deepgram,
    silero,
)
# Correct noise cancellation import for LiveKit Agent >= 1.0
try:
    from livekit.plugins.noise_cancellation import NoiseCancellation
except ImportError:
    try:
        # Alternative import paths for different versions
        from livekit.plugins import noise_cancellation
        NoiseCancellation = noise_cancellation.NoiseCancellation
    except ImportError:
        try:
            from livekit.plugins.noise_cancellation import BVC
            NoiseCancellation = BVC
        except ImportError:
            NoiseCancellation = None
            logging.warning("Noise cancellation plugin not available")

from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ConversationAssistant(Agent):
    def __init__(self, topic: str = "general conversation", difficulty: str = "intermediate") -> None:
        self.topic = topic
        self.difficulty = difficulty
        self.conversation_history = []
        self.session_start_time = datetime.now()
        self.session_metrics = {
            "total_speech_time": 0,
            "filler_words_count": 0,
            "voice_tremors": 0,
            "speech_rate": 0,
            "clarity_score": 0
        }

        system_prompt = f"""You are an AI conversation practice assistant specializing in {topic} at {difficulty} level.
        Your role is to:
        1. Engage in natural conversation about {topic}
        2. Provide constructive feedback on speaking skills
        3. Ask relevant follow-up questions
        4. Maintain a professional but friendly tone
        5. Help the user improve their communication skills

        Keep responses concise and natural, as if in a real conversation."""

        super().__init__(instructions=system_prompt)

    async def on_message(self, message: str) -> None:
        try:
            self.conversation_history.append({"role": "user", "content": message})
            response = await self.generate_response(message)
            self.conversation_history.append({"role": "assistant", "content": response})
            await self.say(response)  # 🔈 Ensure AI speaks the response
            self._update_metrics(message)
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            await self.say("I apologize, but I encountered an error. Please try again.")

    def _update_metrics(self, message: str) -> None:
        self.session_metrics["total_speech_time"] += len(message.split()) * 0.3
        filler_words = ["um", "uh", "like", "you know", "sort of", "kind of"]
        self.session_metrics["filler_words_count"] += sum(
            message.lower().count(word) for word in filler_words
        )
        words = len(message.split())
        time_elapsed = (datetime.now() - self.session_start_time).total_seconds() / 60
        self.session_metrics["speech_rate"] = words / time_elapsed if time_elapsed > 0 else 0

    async def generate_response(self, user_prompt: str) -> str:
        try:
            messages = [
                {"role": "system", "content": "You are a helpful conversation practice assistant. Provide natural, engaging responses that encourage the user to practice their speaking skills."},
                *self.conversation_history
            ]
            response = await self.llm.chat(messages)
            return response
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I apologize, but I encountered an error. Please try again."

    async def generate_session_feedback(self) -> Dict[str, Any]:
        try:
            session_duration = (datetime.now() - self.session_start_time).total_seconds()
            feedback_prompt = f"""
            Based on the following session metrics, provide constructive feedback:
            - Session Duration: {session_duration} seconds
            - Total Speech Time: {self.session_metrics['total_speech_time']} seconds
            - Filler Words Used: {self.session_metrics['filler_words_count']}
            - Voice Tremors Detected: {self.session_metrics['voice_tremors']}
            - Average Speech Rate: {self.session_metrics['speech_rate']} words per minute
            - Clarity Score: {self.session_metrics['clarity_score']}/100

            Please provide:
            1. Overall assessment
            2. Specific areas for improvement
            3. Suggested exercises
            """
            feedback = await self.llm.chat([{"role": "user", "content": feedback_prompt}])
            return {
                "session_duration": session_duration,
                "metrics": self.session_metrics,
                "feedback": feedback
            }
        except Exception as e:
            logger.error(f"Error generating session feedback: {str(e)}")
            return {
                "error": "Failed to generate session feedback",
                "metrics": self.session_metrics
            }

async def entrypoint(ctx: agents.JobContext):
    try:
        metadata = json.loads(os.getenv("ROOM_METADATA", "{}"))
        topic = metadata.get("topic", "general conversation")
        difficulty = metadata.get("difficulty", "intermediate")

        # Updated session configuration for LiveKit Agent >= 1.0
        session = AgentSession(
            stt=deepgram.STT(model="nova-3", language="multi"),
            llm=openai.LLM(model="gpt-4-turbo-preview"),
            tts=deepgram.TTS(model="aura-asteria-en", voice="nova"),
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
        )

        assistant = ConversationAssistant(topic=topic, difficulty=difficulty)

        # Correct room input options for LiveKit Agent >= 1.0
        room_input_options = RoomInputOptions()
        if NoiseCancellation is not None:
            # Use the correct noise cancellation class
            room_input_options.noise_cancellation = NoiseCancellation()
            logger.info("Noise cancellation enabled")
        else:
            logger.warning("Noise cancellation plugin not available, running without noise cancellation")

        await session.start(
            room=ctx.room,
            agent=assistant,
            room_input_options=room_input_options,
        )

        await ctx.connect()

        # 🔊 Speak a default welcome message even if the user says nothing
        await assistant.say(
            f"Hello! I'm your {topic} conversation practice assistant. You can start talking whenever you're ready, and I'll help you improve your speaking skills."
        )

        # Keep the agent running
        while True:
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"Fatal error in agent session: {str(e)}")
        raise

if __name__ == "__main__":
    load_dotenv()
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
