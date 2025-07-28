import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Clock, MessageCircle, AlertCircle } from 'lucide-react';

interface QuestionTimerProps {
  question: string;
  duration: number; // in milliseconds
  onTimeUp: () => void;
  onNextQuestion: () => void;
  questionNumber: number;
  totalQuestions: number;
  isActive: boolean;
}

export function QuestionTimer({ 
  question, 
  duration, 
  onTimeUp, 
  onNextQuestion, 
  questionNumber, 
  totalQuestions, 
  isActive 
}: QuestionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Calculate progress percentage
  const progressPercentage = ((duration - timeLeft) / duration) * 100;
  
  // Warning threshold (30 seconds remaining)
  const warningThreshold = 30000;

  // Format time display
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get timer color based on time remaining
  const getTimerColor = (): string => {
    if (timeLeft <= warningThreshold) return 'text-red-600';
    if (timeLeft <= duration * 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1000;
        
        // Show warning when 30 seconds remaining
        if (newTime <= warningThreshold && !showWarning) {
          setShowWarning(true);
        }
        
        // Time's up
        if (newTime <= 0) {
          clearInterval(interval);
          onTimeUp();
          onNextQuestion();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, onTimeUp, onNextQuestion, showWarning, warningThreshold]);

  // Pause/resume timer
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    setTimeLeft(duration);
    setIsPaused(false);
    setShowWarning(false);
  }, [duration]);

  if (!isActive) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span>Question {questionNumber} of {totalQuestions}</span>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(timeLeft)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Display */}
        <div className="bg-white rounded-lg p-4 border">
          <h3 className="font-medium text-gray-900 mb-2">Current Question:</h3>
          <p className="text-gray-700 leading-relaxed">{question}</p>
        </div>

        {/* Timer Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Time Remaining</span>
            <span className={`font-mono font-bold ${getTimerColor()}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Warning Message */}
        {showWarning && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800 text-sm">
              Time is running out! Wrap up your response.
            </span>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={resetTimer}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 