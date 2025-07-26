/**
 * SessionFeedback Component
 * 
 * Comprehensive post-session feedback component that provides detailed analysis
 * and allows users to click on issues to replay specific moments in the session.
 * 
 * Features:
 * - Session overview with key metrics
 * - Interactive issue highlighting
 * - Video replay functionality
 * - Actionable improvement suggestions
 * - Filler word detection with timestamps
 * - Speech pattern analysis
 */

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Mic, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  MessageSquare,
  Zap
} from "lucide-react";

interface SessionFeedbackProps {
  sessionData: {
    duration: number;
    totalFillerWords: number;
    averageVolume: number;
    speakingPercentage: number;
    volumeIssues: number;
    clarityIssues: number;
    paceIssues: number;
    speechSegments: number;
    fillerWords: Array<{
      word: string;
      timestamp: number;
      confidence: number;
    }>;
    volumeVariations: Array<{
      timestamp: number;
      volume: number;
      type: 'peak' | 'valley' | 'normal';
    }>;
    voiceMetrics: Array<{
      timestamp: number;
      volume: number;
      clarity: number;
      pace: number;
      speechPatterns?: {
        pace: 'slow' | 'normal' | 'fast';
        volume: 'quiet' | 'normal' | 'loud';
        clarity: 'unclear' | 'clear' | 'excellent';
      };
    }>;
  };
  videoRef?: React.RefObject<HTMLVideoElement>;
  onTimestampClick?: (timestamp: number) => void;
}

export function SessionFeedback({ 
  sessionData, 
  videoRef, 
  onTimestampClick 
}: SessionFeedbackProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOverallScore = () => {
    const volumeScore = sessionData.averageVolume > 40 && sessionData.averageVolume < 80 ? 100 : 50;
    const fillerScore = Math.max(0, 100 - (sessionData.totalFillerWords * 10));
    const speakingScore = sessionData.speakingPercentage > 30 && sessionData.speakingPercentage < 80 ? 100 : 70;
    
    return Math.round((volumeScore + fillerScore + speakingScore) / 3);
  };

  const getVolumeStatus = (volume: number) => {
    if (volume < 30) return { status: "Too quiet", variant: "destructive" as const, icon: Volume2 };
    if (volume > 80) return { status: "Too loud", variant: "destructive" as const, icon: Volume2 };
    if (volume > 40) return { status: "Good volume", variant: "default" as const, icon: CheckCircle };
    return { status: "Moderate", variant: "secondary" as const, icon: Volume2 };
  };

  const getFillerWordStatus = (count: number) => {
    if (count === 0) return { status: "Excellent", variant: "default" as const, icon: CheckCircle };
    if (count <= 3) return { status: "Good", variant: "secondary" as const, icon: CheckCircle };
    if (count <= 7) return { status: "Needs work", variant: "destructive" as const, icon: AlertTriangle };
    return { status: "Poor", variant: "destructive" as const, icon: AlertTriangle };
  };

  const handleTimestampClick = (timestamp: number) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
    if (videoRef?.current) {
      videoRef.current.currentTime = timestamp / 1000;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const overallScore = getOverallScore();
  const volumeStatus = getVolumeStatus(sessionData.averageVolume);
  const fillerStatus = getFillerWordStatus(sessionData.totalFillerWords);

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatTime(sessionData.duration)}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallScore}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{sessionData.speechSegments}</div>
              <div className="text-sm text-muted-foreground">Speech Segments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{sessionData.speakingPercentage}%</div>
              <div className="text-sm text-muted-foreground">Speaking Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Volume Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Volume Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={volumeStatus.variant}>
                <volumeStatus.icon className="w-3 h-3 mr-1" />
                {volumeStatus.status}
              </Badge>
            </div>
            <Progress value={sessionData.averageVolume} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Average: {sessionData.averageVolume}%
            </div>
            {sessionData.volumeIssues > 0 && (
              <div className="text-xs text-red-600">
                {sessionData.volumeIssues} volume variations detected
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filler Words */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Filler Words
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={fillerStatus.variant}>
                <fillerStatus.icon className="w-3 h-3 mr-1" />
                {fillerStatus.status}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{sessionData.totalFillerWords}</div>
            <div className="text-xs text-muted-foreground">
              Total filler words detected
            </div>
            {sessionData.fillerWords.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Detected words:</div>
                <div className="flex flex-wrap gap-1">
                  {sessionData.fillerWords.slice(0, 5).map((filler, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => handleTimestampClick(filler.timestamp)}
                    >
                      "{filler.word}" ({formatTime(filler.timestamp)})
                    </Button>
                  ))}
                  {sessionData.fillerWords.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{sessionData.fillerWords.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Speech Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Speech Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clarity Issues:</span>
                <Badge variant={sessionData.clarityIssues > 5 ? "destructive" : "secondary"}>
                  {sessionData.clarityIssues}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pace Issues:</span>
                <Badge variant={sessionData.paceIssues > 5 ? "destructive" : "secondary"}>
                  {sessionData.paceIssues}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <div>• {sessionData.speakingPercentage}% speaking time</div>
              <div>• {sessionData.speechSegments} speech segments</div>
              <div>• {formatTime(sessionData.duration - (sessionData.duration * sessionData.speakingPercentage / 100))} silence time</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Issues & Improvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Volume Issues */}
            {sessionData.volumeVariations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Volume Variations</h4>
                <div className="space-y-2">
                  {sessionData.volumeVariations.slice(0, 5).map((variation, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => handleTimestampClick(variation.timestamp)}
                    >
                      <span>
                        {variation.type === 'peak' ? 'Too Loud' : 'Too Quiet'} 
                        ({variation.volume}%)
                      </span>
                      <span className="text-muted-foreground">
                        {formatTime(variation.timestamp)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Clarity Issues */}
            {sessionData.clarityIssues > 0 && (
              <div>
                <h4 className="font-medium mb-2">Clarity Issues</h4>
                <div className="text-sm text-muted-foreground">
                  {sessionData.clarityIssues} moments of unclear speech detected.
                  Focus on enunciating words clearly and speaking at a moderate pace.
                </div>
              </div>
            )}

            {/* Pace Issues */}
            {sessionData.paceIssues > 0 && (
              <div>
                <h4 className="font-medium mb-2">Speaking Pace</h4>
                <div className="text-sm text-muted-foreground">
                  {sessionData.paceIssues} pace variations detected.
                  Try to maintain a consistent, moderate speaking speed.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessionData.totalFillerWords > 3 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Reduce Filler Words</h4>
                  <p className="text-sm text-amber-700">
                    You used {sessionData.totalFillerWords} filler words. Practice pausing instead of saying "um" or "uh".
                    Take a moment to think before speaking.
                  </p>
                </div>
              </div>
            )}

            {sessionData.averageVolume < 40 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Volume2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Increase Volume</h4>
                  <p className="text-sm text-blue-700">
                    Your average volume was {sessionData.averageVolume}%. Speak louder to ensure you're clearly heard.
                    Practice projecting your voice confidently.
                  </p>
                </div>
              </div>
            )}

            {sessionData.averageVolume > 80 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <Volume2 className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Lower Volume</h4>
                  <p className="text-sm text-red-700">
                    Your average volume was {sessionData.averageVolume}%. Speak more quietly to avoid overwhelming others.
                    Practice modulating your voice appropriately.
                  </p>
                </div>
              </div>
            )}

            {sessionData.speakingPercentage < 30 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Mic className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Speak More</h4>
                  <p className="text-sm text-green-700">
                    You spoke for only {sessionData.speakingPercentage}% of the session. 
                    Try to contribute more to the conversation and share your thoughts.
                  </p>
                </div>
              </div>
            )}

            {sessionData.speakingPercentage > 80 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Mic className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-800">Listen More</h4>
                  <p className="text-sm text-purple-700">
                    You spoke for {sessionData.speakingPercentage}% of the session. 
                    Practice active listening and give others time to speak.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Eye className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-800">General Tips</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Maintain eye contact with the camera</li>
                  <li>• Use natural hand gestures</li>
                  <li>• Take pauses to think before responding</li>
                  <li>• Practice your responses to common questions</li>
                  <li>• Record yourself and watch for body language</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 