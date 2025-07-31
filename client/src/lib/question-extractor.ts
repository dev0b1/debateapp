// Question extraction utility for AI agent responses

export interface ExtractedQuestion {
  question: string;
  category: string;
  suggestedDuration: number; // in milliseconds
  confidence: number; // 0-1, how confident we are this is the main question
}

export function extractMainQuestion(aiResponse: string): ExtractedQuestion {
  // Clean the response
  const cleanedResponse = aiResponse.trim();
  
  // Question patterns in order of priority
  const questionPatterns = [
    // Direct questions with quotes
    {
      pattern: /"([^"]+\?)"/,
      category: 'Direct Question',
      duration: 180000, // 3 minutes
      confidence: 0.9
    },
    // Questions ending with ?
    {
      pattern: /([A-Z][^.!?]*\?)/,
      category: 'Question',
      duration: 180000,
      confidence: 0.8
    },
    // "Tell me about..." prompts
    {
      pattern: /(Tell me about[^.!?]*)/,
      category: 'Experience',
      duration: 180000,
      confidence: 0.7
    },
    // "Describe..." prompts
    {
      pattern: /(Describe[^.!?]*)/,
      category: 'Description',
      duration: 150000, // 2.5 minutes
      confidence: 0.7
    },
    // "How would you..." prompts
    {
      pattern: /(How would you[^.!?]*)/,
      category: 'Problem Solving',
      duration: 150000,
      confidence: 0.7
    },
    // "What would you do..." prompts
    {
      pattern: /(What would you do[^.!?]*)/,
      category: 'Problem Solving',
      duration: 150000,
      confidence: 0.7
    },
    // "Can you explain..." prompts
    {
      pattern: /(Can you explain[^.!?]*)/,
      category: 'Explanation',
      duration: 120000, // 2 minutes
      confidence: 0.6
    },
    // "Walk me through..." prompts
    {
      pattern: /(Walk me through[^.!?]*)/,
      category: 'Process',
      duration: 180000,
      confidence: 0.6
    },
    // "Give me an example..." prompts
    {
      pattern: /(Give me an example[^.!?]*)/,
      category: 'Example',
      duration: 120000,
      confidence: 0.6
    }
  ];

  // Try to find a question using patterns
  for (const { pattern, category, duration, confidence } of questionPatterns) {
    const match = cleanedResponse.match(pattern);
    if (match) {
      return {
        question: match[1].trim(),
        category,
        suggestedDuration: duration,
        confidence
      };
    }
  }

  // Fallback: extract first meaningful sentence
  const sentences = cleanedResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    
    // Determine category based on content
    let category = 'General';
    let duration = 120000;
    
    if (firstSentence.toLowerCase().includes('experience')) {
      category = 'Experience';
      duration = 180000;
    } else if (firstSentence.toLowerCase().includes('challenge') || firstSentence.toLowerCase().includes('problem')) {
      category = 'Problem Solving';
      duration = 150000;
    } else if (firstSentence.toLowerCase().includes('team')) {
      category = 'Teamwork';
      duration = 150000;
    } else if (firstSentence.toLowerCase().includes('leadership')) {
      category = 'Leadership';
      duration = 180000;
    }

    return {
      question: firstSentence,
      category,
      suggestedDuration: duration,
      confidence: 0.4 // Lower confidence for fallback
    };
  }

  // Last resort: return a generic question
  return {
    question: "Please respond to the debate opponent's question.",
    category: 'General',
    suggestedDuration: 120000,
    confidence: 0.2
  };
}

// Categorize questions for analytics
export function categorizeQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('experience') || lowerQuestion.includes('background')) {
    return 'Experience';
  }
  if (lowerQuestion.includes('challenge') || lowerQuestion.includes('problem') || lowerQuestion.includes('difficult')) {
    return 'Problem Solving';
  }
  if (lowerQuestion.includes('team') || lowerQuestion.includes('collaboration')) {
    return 'Teamwork';
  }
  if (lowerQuestion.includes('leadership') || lowerQuestion.includes('manage')) {
    return 'Leadership';
  }
  if (lowerQuestion.includes('goal') || lowerQuestion.includes('future')) {
    return 'Goals';
  }
  if (lowerQuestion.includes('strength') || lowerQuestion.includes('weakness')) {
    return 'Self Assessment';
  }
  if (lowerQuestion.includes('project') || lowerQuestion.includes('work')) {
    return 'Work Examples';
  }
  if (lowerQuestion.includes('why') || lowerQuestion.includes('motivation')) {
    return 'Motivation';
  }
  
  return 'General';
}

// Get suggested duration based on question type
export function getQuestionDuration(question: string): number {
  const category = categorizeQuestion(question);
  
  const durationMap: Record<string, number> = {
    'Experience': 180000,      // 3 minutes
    'Problem Solving': 150000, // 2.5 minutes
    'Teamwork': 150000,       // 2.5 minutes
    'Leadership': 180000,      // 3 minutes
    'Goals': 120000,          // 2 minutes
    'Self Assessment': 120000, // 2 minutes
    'Work Examples': 180000,   // 3 minutes
    'Motivation': 120000,      // 2 minutes
    'General': 120000          // 2 minutes
  };
  
  return durationMap[category] || 120000;
} 