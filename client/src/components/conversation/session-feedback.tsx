import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, 
  Target, 
  TrendingUp, 
  Zap, 
  Brain,
  Heart,
  Shield,
  Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";

interface SessionFeedbackProps {
  sessionData: any;
  onClose: () => void;
  onStartNewSession: () => void;
}

export function SessionFeedback({ sessionData, onClose, onStartNewSession }: SessionFeedbackProps) {
  const feedback = sessionData?.feedback || {};
  const stats = sessionData?.stats || {};

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Session Feedback</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-blue-600">
                  {stats.overallScore || 75}%
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getScoreColor(stats.overallScore || 75)}>
                      {getScoreLabel(stats.overallScore || 75)}
                    </Badge>
                  </div>
                  <Progress value={stats.overallScore || 75} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4" />
                  Critical Thinking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.criticalThinking || 70}%
                </div>
                <Progress value={stats.criticalThinking || 70} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-4 w-4" />
                  Communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.communication || 80}%
                </div>
                <Progress value={stats.communication || 80} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" />
                  Argument Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.argumentStructure || 75}%
                </div>
                <Progress value={stats.argumentStructure || 75} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  Rebuttal Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.rebuttalSkills || 65}%
                </div>
                <Progress value={stats.rebuttalSkills || 65} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          {feedback.insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.insights.map((insight: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {feedback.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Session Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalQuestions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.sessionDuration || 0}m
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.argumentsMade || 0}
                  </div>
                  <div className="text-sm text-gray-600">Arguments</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.rebuttals || 0}
                  </div>
                  <div className="text-sm text-gray-600">Rebuttals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button onClick={onStartNewSession} className="flex-1">
            Start New Session
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 