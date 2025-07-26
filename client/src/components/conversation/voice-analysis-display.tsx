/**
 * Simplified VoiceAnalysisDisplay Component for Basic Voice Monitoring
 * 
 * This component provides a simple visualization of basic voice metrics during conversation practice.
 * It focuses on essential feedback only to avoid overwhelming users.
 * 
 * Key Features:
 * - Audio level visualization
 * - Speaking status indicator
 * - Basic volume feedback
 * 
 * Connections:
 * - Receives data from simplified useVoiceAnalyzer hook
 * 
 * Props:
 * - voiceMetrics: Basic voice metrics from the analyzer
 * - audioLevel: Current audio input level
 * - isAnalyzing: Whether analysis is in progress
 * - isRecording: Whether audio is being recorded
 * - isSpeaking: Whether user is currently speaking
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Mic, Volume2, Brain, MessageSquare } from "lucide-react";
import { VoiceMetric } from "@shared/schema";

interface SimpleVoiceMetric extends VoiceMetric {
  isSpeaking?: boolean;
}

interface VoiceAnalysisDisplayProps {
  voiceMetrics: SimpleVoiceMetric[];
  audioLevel: number;
  isAnalyzing: boolean;
  isRecording: boolean;
  isSpeaking?: boolean;
}

export function VoiceAnalysisDisplay({
  voiceMetrics,
  audioLevel,
  isAnalyzing,
  isRecording,
  isSpeaking = false
}: VoiceAnalysisDisplayProps) {
  const [realtimeMetrics, setRealtimeMetrics] = useState<SimpleVoiceMetric | null>(null);

  useEffect(() => {
    if (voiceMetrics.length > 0) {
      setRealtimeMetrics(voiceMetrics[voiceMetrics.length - 1]);
    }
  }, [voiceMetrics]);

  const getAverageMetrics = () => {
    if (voiceMetrics.length === 0) return null;
    
    const recent = voiceMetrics.slice(-20);
    return {
      volume: Math.round(recent.reduce((sum, m) => sum + m.volume, 0) / recent.length),
      speakingTime: Math.round(recent.filter(m => m.isSpeaking).length / recent.length * 100)
    };
  };

  const getVolumeStatus = (volume: number) => {
    if (volume < 20) return { status: "Too quiet", variant: "destructive" as const };
    if (volume > 80) return { status: "Too loud", variant: "destructive" as const };
    if (volume > 40) return { status: "Good volume", variant: "default" as const };
    return { status: "Moderate", variant: "secondary" as const };
  };

  const averages = getAverageMetrics();
  const volumeStatus = realtimeMetrics ? getVolumeStatus(realtimeMetrics.volume) : null;

  return (
    <div className="space-y-4">
      {/* Recording Status */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isRecording ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-sm">Recording: {isRecording ? 'Active' : 'Inactive'}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 ${isAnalyzing ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className="text-sm">Analysis: {isAnalyzing ? 'Processing' : 'Idle'}</span>
        </div>
      </div>

      {/* Speaking Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Speaking Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={isSpeaking ? "default" : "secondary"}>
              {isSpeaking ? "Speaking" : "Listening"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Audio Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={audioLevel} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium">{Math.round(audioLevel)}%</span>
              <span>100%</span>
            </div>
            {volumeStatus && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={volumeStatus.variant}>{volumeStatus.status}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conversation Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Speak clearly and at a moderate pace</p>
            <p>• Maintain consistent volume (40-70%)</p>
            <p>• Look directly at the camera</p>
            <p>• Listen actively when not speaking</p>
            <p>• Take natural pauses between thoughts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}