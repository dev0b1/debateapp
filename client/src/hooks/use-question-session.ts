import { useState, useCallback, useRef } from 'react';
import { extractMainQuestion, ExtractedQuestion } from '../lib/question-extractor';

export interface QuestionSession {
  id: string;
  question: string;
  category: string;
  startTime: number;
  endTime?: number;
  duration: number; // in milliseconds
  userResponse?: string;
  confidence: number;
  completed: boolean;
}

export interface QuestionSessionStats {
  totalQuestions: number;
  completedQuestions: number;
  averageConfidence: number;
  totalDuration: number;
  categories: Record<string, number>;
}

interface UseQuestionSessionOptions {
  maxQuestions?: number;
  defaultDuration?: number;
}

export function useQuestionSession(options: UseQuestionSessionOptions = {}) {
  const {
    maxQuestions = 10,
    defaultDuration = 180000 // 3 minutes
  } = options;

  const [currentQuestion, setCurrentQuestion] = useState<QuestionSession | null>(null);
  const [questionHistory, setQuestionHistory] = useState<QuestionSession[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  
  const sessionStartTimeRef = useRef<number>(0);

  // Start a new question session
  const startQuestion = useCallback((aiResponse: string) => {
    const extracted = extractMainQuestion(aiResponse);
    const questionId = `q_${Date.now()}`;
    
    const newQuestion: QuestionSession = {
      id: questionId,
      question: extracted.question,
      category: extracted.category,
      startTime: Date.now(),
      duration: extracted.suggestedDuration || defaultDuration,
      confidence: extracted.confidence,
      completed: false
    };

    setCurrentQuestion(newQuestion);
    setQuestionNumber(prev => prev + 1);
    setIsActive(true);
    
    console.log('🎯 New question started:', extracted.question);
  }, [defaultDuration]);

  // End current question
  const endQuestion = useCallback(() => {
    if (!currentQuestion) return;

    const endTime = Date.now();
    const duration = endTime - currentQuestion.startTime;

    const completedQuestion: QuestionSession = {
      ...currentQuestion,
      endTime,
      duration,
      completed: true
    };

    setQuestionHistory(prev => [...prev, completedQuestion]);
    setCurrentQuestion(null);
    setIsActive(false);
    
    console.log('✅ Question completed:', {
      question: completedQuestion.question,
      duration: duration / 1000
    });
  }, [currentQuestion]);



  // Get session statistics
  const getSessionStats = useCallback((): QuestionSessionStats => {
    const allQuestions = [...questionHistory];
    if (currentQuestion) {
      allQuestions.push(currentQuestion);
    }

    if (allQuestions.length === 0) {
      return {
        totalQuestions: 0,
        completedQuestions: 0,
        averageConfidence: 0,
        totalDuration: 0,
        categories: {}
      };
    }

    const completedQuestions = allQuestions.filter(q => q.completed);
    const totalDuration = completedQuestions.reduce((sum, q) => sum + q.duration, 0);
    const averageConfidence = completedQuestions.length > 0
      ? completedQuestions.reduce((sum, q) => sum + q.confidence, 0) / completedQuestions.length
      : 0;

    // Count categories
    const categories: Record<string, number> = {};
    allQuestions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });

    return {
      totalQuestions: allQuestions.length,
      completedQuestions: completedQuestions.length,
      averageConfidence,
      totalDuration,
      categories
    };
  }, [questionHistory, currentQuestion]);

  // Check if session should end
  const shouldEndSession = useCallback((): boolean => {
    return questionNumber >= maxQuestions;
  }, [questionNumber, maxQuestions]);

  // Start session
  const startSession = useCallback(() => {
    setQuestionHistory([]);
    setQuestionNumber(0);
    setIsActive(false);
    sessionStartTimeRef.current = Date.now();
    console.log('🚀 Interview session started');
  }, []);

  // End session
  const endSession = useCallback(() => {
    if (currentQuestion) {
      endQuestion();
    }
    setIsActive(false);
    console.log('🏁 Interview session ended');
  }, [currentQuestion, endQuestion]);

  // Get current question display info
  const getCurrentQuestionInfo = useCallback(() => {
    if (!currentQuestion) return null;

    return {
      question: currentQuestion.question,
      category: currentQuestion.category,
      questionNumber,
      totalQuestions: maxQuestions,
      duration: currentQuestion.duration,
      isActive
    };
  }, [currentQuestion, questionNumber, maxQuestions, isActive]);

  return {
    // State
    currentQuestion,
    questionHistory,
    isActive,
    questionNumber,
    
    // Actions
    startQuestion,
    endQuestion,
    startSession,
    endSession,
    
    // Computed
    getSessionStats,
    getCurrentQuestionInfo,
    shouldEndSession
  };
} 