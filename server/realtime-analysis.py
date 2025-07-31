#!/usr/bin/env python3
"""
Real-time analysis system for debate practice
"""

import asyncio
import json
import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class AnalysisResult:
    is_rambling: bool = False
    filler_word_count: int = 0
    is_off_topic: bool = False
    response_duration: float = 0.0
    should_interrupt: bool = False
    interruption_reason: str = ""
    current_topic: str = ""

class RealtimeAnalyzer:
    def __init__(self, debater_role: Dict):
        self.debater_role = debater_role
        self.role_id = debater_role.get('id', 'standard')
        self.interruption_threshold = debater_role.get('interruptionThreshold', 120)
        self.filler_word_tolerance = debater_role.get('fillerWordTolerance', 0.7)
        
        # Filler words to detect
        self.filler_words = [
            'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
            'sort of', 'kind of', 'right', 'so', 'well', 'i mean', 'i guess',
            'i think', 'i feel', 'i believe', 'maybe', 'perhaps', 'probably'
        ]
        
        # Response tracking
        self.current_response_start = None
        self.current_response_text = ""
        self.response_history = []
        
    def analyze_transcript(self, transcript: str, duration: float) -> AnalysisResult:
        """Analyze a transcript for various issues"""
        result = AnalysisResult()
        result.response_duration = duration
        
        # Convert to lowercase for analysis
        text_lower = transcript.lower()
        
        # 1. Check for filler words
        filler_count = 0
        for filler in self.filler_words:
            filler_count += len(re.findall(r'\b' + re.escape(filler) + r'\b', text_lower))
        
        result.filler_word_count = filler_count
        filler_ratio = filler_count / max(len(text_lower.split()), 1)
        
        # 2. Check for rambling (long responses)
        word_count = len(transcript.split())
        is_rambling = word_count > 100 or duration > self.interruption_threshold
        
        # 3. Check for off-topic responses (basic keyword matching)
        # This is a simplified version - in a real implementation, you'd use NLP
        off_topic_indicators = [
            'i don\'t know', 'i\'m not sure', 'that\'s a good question',
            'let me think', 'that\'s interesting', 'i haven\'t thought about that'
        ]
        
        is_off_topic = any(indicator in text_lower for indicator in off_topic_indicators)
        
        # 4. Determine if interruption is needed based on role
        should_interrupt = False
        interruption_reason = ""
        
        if self.role_id == 'tough':
            # Tough debater is more strict
            if is_rambling:
                should_interrupt = True
                interruption_reason = "Response too long"
            elif filler_ratio > 0.3:  # 30% filler words
                should_interrupt = True
                interruption_reason = "Too many filler words"
            elif is_off_topic:
                should_interrupt = True
                interruption_reason = "Going off-topic"
        elif self.role_id == 'friendly':
            # Friendly debater is more tolerant
            if is_rambling and duration > self.interruption_threshold * 1.5:
                should_interrupt = True
                interruption_reason = "Response getting long"
            elif filler_ratio > 0.5:  # 50% filler words
                should_interrupt = True
                interruption_reason = "Many filler words"
        else:
            # Standard debater
            if is_rambling:
                should_interrupt = True
                interruption_reason = "Response too long"
            elif filler_ratio > 0.4:  # 40% filler words
                should_interrupt = True
                interruption_reason = "Too many filler words"
        
        result.is_rambling = is_rambling
        result.is_off_topic = is_off_topic
        result.should_interrupt = should_interrupt
        result.interruption_reason = interruption_reason
        
        return result
    
    def get_interruption_message(self, reason: str) -> str:
        """Get appropriate interruption message based on role and reason"""
        if self.role_id == 'tough':
            if reason == "Response too long":
                return "I need to interrupt. Your response is getting too long. Please be more concise."
            elif reason == "Too many filler words":
                return "I'm interrupting because you're using too many filler words. Speak more directly."
            elif reason == "Going off-topic":
                return "You're going off-topic. Let's stay focused on the debate question."
            else:
                return "I need to interrupt. Please be more concise."
        elif self.role_id == 'friendly':
            if reason == "Response getting long":
                return "I'd like to interject here. Your response is getting quite long."
            elif reason == "Many filler words":
                return "I notice you're using many filler words. Try to speak more directly."
            else:
                return "I'd like to interject here."
        else:
            # Standard debater
            if reason == "Response too long":
                return "I need to interrupt. Your response is getting too long."
            elif reason == "Too many filler words":
                return "I'm interrupting because you're using too many filler words."
            elif reason == "Going off-topic":
                return "You're going off-topic. Let's stay focused."
            else:
                return "I need to interrupt. Please be more concise."
    
    def update_response_tracking(self, transcript: str, is_speaking: bool):
        """Track ongoing response for real-time analysis"""
        if is_speaking and self.current_response_start is None:
            # Started speaking
            self.current_response_start = datetime.now()
            self.current_response_text = transcript
        elif is_speaking:
            # Continuing to speak
            self.current_response_text = transcript
        elif not is_speaking and self.current_response_start is not None:
            # Stopped speaking - analyze the response
            duration = (datetime.now() - self.current_response_start).total_seconds()
            analysis = self.analyze_transcript(self.current_response_text, duration)
            
            # Store in history
            self.response_history.append({
                'text': self.current_response_text,
                'duration': duration,
                'analysis': analysis,
                'timestamp': datetime.now().isoformat()
            })
            
            # Reset for next response
            self.current_response_start = None
            self.current_response_text = ""
            
            return analysis
        
        return None

# Example usage and testing
async def test_analyzer():
    """Test the real-time analyzer"""
    
    # Test with different debater roles
    roles = [
        {'id': 'tough', 'interruptionThreshold': 60, 'fillerWordTolerance': 0.3},
        {'id': 'friendly', 'interruptionThreshold': 180, 'fillerWordTolerance': 0.7},
        {'id': 'standard', 'interruptionThreshold': 120, 'fillerWordTolerance': 0.5}
    ]
    
    test_responses = [
        "Um, like, you know, I think that, um, basically what happened was, like, you know, I mean, it was sort of, um, you know, a situation where, like, I had to, um, you know, deal with, like, this problem, and, um, you know, it was, like, really challenging, and, um, you know, I had to, like, think about it, and, um, you know, basically, um, you know, I came up with, like, a solution, and, um, you know, it worked out, um, you know, pretty well, I think, um, you know, in the end.",
        "I don't really know how to answer that question. That's a good question. I haven't really thought about it that much. Maybe I should think about it more. That's interesting. I'm not sure what to say.",
        "I led a team of 5 developers on a project that improved our application's performance by 40%. We identified bottlenecks in the database queries, optimized the code, and implemented caching strategies. The project was completed on time and under budget."
    ]
    
    for role in roles:
        print(f"\n=== Testing {role['id']} debater ===")
        analyzer = RealtimeAnalyzer(role)
        
        for i, response in enumerate(test_responses):
            print(f"\nResponse {i+1}:")
            print(f"Text: {response[:100]}...")
            
            analysis = analyzer.analyze_transcript(response, 30.0)
            print(f"Analysis: {analysis}")
            
            if analysis.should_interrupt:
                message = analyzer.get_interruption_message(analysis.interruption_reason)
                print(f"Interruption: {message}")

if __name__ == "__main__":
    asyncio.run(test_analyzer()) 