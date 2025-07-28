import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  Eye, 
  TrendingUp, 
  MessageCircle, 
  BarChart3,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { QuestionSession, QuestionSessionStats } from '../../hooks/use-question-session';

interface SessionAnalyticsProps {
  questionHistory: QuestionSession[];
  sessionStats: QuestionSessionStats;
  onClose: () => void;
}

export function SessionAnalytics({ questionHistory, sessionStats, onClose }: SessionAnalyticsProps) {
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEyeContactColor = (score: number): string => {
    if (score > 0.7) return 'text-green-600';
    if (score > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEyeContactIcon = (score: number) => {
    if (score > 0.7) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score > 0.4) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Experience': 'bg-blue-100 text-blue-800',
      'Problem Solving': 'bg-purple-100 text-purple-800',
      'Teamwork': 'bg-green-100 text-green-800',
      'Leadership': 'bg-orange-100 text-orange-800',
      'Goals': 'bg-pink-100 text-pink-800',
      'Self Assessment': 'bg-indigo-100 text-indigo-800',
      'Work Examples': 'bg-teal-100 text-teal-800',
      'Motivation': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['General'];
  };

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Interview Session Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sessionStats.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sessionStats.completedQuestions}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(sessionStats.totalDuration)}
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(sessionStats.averageConfidence * 100)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Overall Performance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confidence Score</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {Math.round(sessionStats.averageConfidence * 100)}%
                  </span>
                </div>
              </div>
              <Progress 
                value={sessionStats.averageConfidence * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Question Categories */}
          {Object.keys(sessionStats.categories).length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Question Categories</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(sessionStats.categories).map(([category, count]) => (
                  <Badge 
                    key={category} 
                    className={getCategoryColor(category)}
                  >
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Question History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionHistory.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    <Badge className={getCategoryColor(question.category)}>
                      {question.category}
                    </Badge>
                  </div>
                  <p className="text-gray-700 font-medium">{question.question}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {formatTime(question.duration)}
                  </div>
                </div>
              </div>

              {/* Question Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">
                      {formatTime(question.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-medium">
                      {Math.round(question.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionStats.averageConfidence < 0.7 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Improve Confidence</p>
                <p className="text-xs text-gray-600">
                  Try to speak more confidently and provide specific examples in your responses.
                </p>
              </div>
            </div>
          )}
          
          {sessionStats.averageConfidence > 0.8 && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Excellent Confidence</p>
                <p className="text-xs text-gray-600">
                  Great job maintaining confidence throughout the interview!
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Practice Regularly</p>
              <p className="text-xs text-gray-600">
                Continue practicing with different question types to improve your interview skills.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Close Button */}
      <div className="flex justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Close Analytics
        </button>
      </div>
    </div>
  );
} 