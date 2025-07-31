import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Target, 
  Award,
  Zap,
  Brain,
  Heart
} from "lucide-react";

interface DebateMetrics {
  speakingTime: number; // seconds
  argumentCount: number;
  responseTime: number; // average response time in seconds
  clarityScore: number; // 1-10
  persuasivenessScore: number; // 1-10
  logicalConsistency: number; // 1-10
  emotionalAppeal: number; // 1-10
  counterArguments: number;
  evidenceUsed: number;
  interruptions: number;
}

interface DebateScoringProps {
  sessionId: string;
  onScoreUpdate?: (metrics: DebateMetrics) => void;
}

export function DebateScoring({ sessionId, onScoreUpdate }: DebateScoringProps) {
  const [metrics, setMetrics] = useState<DebateMetrics>({
    speakingTime: 0,
    argumentCount: 0,
    responseTime: 0,
    clarityScore: 7,
    persuasivenessScore: 6,
    logicalConsistency: 8,
    emotionalAppeal: 5,
    counterArguments: 0,
    evidenceUsed: 0,
    interruptions: 0
  });

  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Simulate real-time metrics updates
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setMetrics(prev => {
          const newMetrics = {
            ...prev,
            speakingTime: prev.speakingTime + 1,
            argumentCount: prev.argumentCount + (Math.random() > 0.95 ? 1 : 0),
            counterArguments: prev.counterArguments + (Math.random() > 0.98 ? 1 : 0),
            evidenceUsed: prev.evidenceUsed + (Math.random() > 0.97 ? 1 : 0),
            interruptions: prev.interruptions + (Math.random() > 0.99 ? 1 : 0)
          };
          
          if (onScoreUpdate) {
            onScoreUpdate(newMetrics);
          }
          
          return newMetrics;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive, onScoreUpdate]);

  const startScoring = () => {
    setIsActive(true);
    setStartTime(Date.now());
  };

  const stopScoring = () => {
    setIsActive(false);
  };

  const getOverallScore = () => {
    const scores = [
      metrics.clarityScore,
      metrics.persuasivenessScore,
      metrics.logicalConsistency,
      metrics.emotionalAppeal
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Debate Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {getOverallScore()}/10
            </div>
            <div className="text-sm text-gray-600">Overall Performance</div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={startScoring}
              disabled={isActive}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Scoring
            </button>
            <button
              onClick={stopScoring}
              disabled={!isActive}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Stop Scoring
            </button>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clarity</span>
                <Badge className={getScoreBadge(metrics.clarityScore)}>
                  {metrics.clarityScore}/10
                </Badge>
              </div>
              <Progress value={metrics.clarityScore * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Persuasiveness</span>
                <Badge className={getScoreBadge(metrics.persuasivenessScore)}>
                  {metrics.persuasivenessScore}/10
                </Badge>
              </div>
              <Progress value={metrics.persuasivenessScore * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Logic</span>
                <Badge className={getScoreBadge(metrics.logicalConsistency)}>
                  {metrics.logicalConsistency}/10
                </Badge>
              </div>
              <Progress value={metrics.logicalConsistency * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Emotional Appeal</span>
                <Badge className={getScoreBadge(metrics.emotionalAppeal)}>
                  {metrics.emotionalAppeal}/10
                </Badge>
              </div>
              <Progress value={metrics.emotionalAppeal * 10} className="h-2" />
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-lg font-semibold">{Math.floor(metrics.speakingTime / 60)}m {metrics.speakingTime % 60}s</div>
              <div className="text-xs text-gray-500">Speaking Time</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-lg font-semibold">{metrics.argumentCount}</div>
              <div className="text-xs text-gray-500">Arguments</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-2">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-lg font-semibold">{metrics.counterArguments}</div>
              <div className="text-xs text-gray-500">Counters</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-lg font-semibold">{metrics.evidenceUsed}</div>
              <div className="text-xs text-gray-500">Evidence</div>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Performance Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use specific examples to support your arguments</li>
              <li>• Address counterarguments proactively</li>
              <li>• Maintain logical consistency throughout</li>
              <li>• Balance emotion with reason</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 