import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, 
  Target, 
  TrendingUp, 
  Zap, 
  Brain,
  Clock,
  BarChart3,
  Activity
} from "lucide-react";

interface SessionAnalyticsProps {
  questionHistory: any[];
  sessionStats: any;
}

export function SessionAnalytics({ questionHistory, sessionStats }: SessionAnalyticsProps) {
  const stats = sessionStats || {};
  
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'challenge': return 'bg-red-100 text-red-800';
      case 'clarification': return 'bg-blue-100 text-blue-800';
      case 'follow-up': return 'bg-green-100 text-green-800';
      case 'rebuttal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalQuestions || 0}</div>
                <div className="text-xs text-gray-600">Questions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.sessionDuration || 0}m</div>
                <div className="text-xs text-gray-600">Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.argumentsMade || 0}</div>
                <div className="text-xs text-gray-600">Arguments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.avgResponseTime || 0}s</div>
                <div className="text-xs text-gray-600">Avg Response</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Critical Thinking</span>
                <span className="text-sm text-gray-600">{stats.criticalThinking || 75}%</span>
              </div>
              <Progress value={stats.criticalThinking || 75} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Communication</span>
                <span className="text-sm text-gray-600">{stats.communication || 80}%</span>
              </div>
              <Progress value={stats.communication || 80} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Argument Structure</span>
                <span className="text-sm text-gray-600">{stats.argumentStructure || 70}%</span>
              </div>
              <Progress value={stats.argumentStructure || 70} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Rebuttal Skills</span>
                <span className="text-sm text-gray-600">{stats.rebuttalSkills || 65}%</span>
              </div>
              <Progress value={stats.rebuttalSkills || 65} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Question History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questionHistory && questionHistory.length > 0 ? (
              questionHistory.map((question, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getQuestionTypeColor(question.type)}>
                          {question.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(question.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{question.text}</p>
                      {question.response && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Response:</strong> {question.response}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {question.duration}s
                      </div>
                      {question.score && (
                        <div className="text-xs font-medium text-green-600">
                          {question.score}/10
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No questions yet. Start your debate to see analytics!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      {stats.insights && stats.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.insights.map((insight: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 