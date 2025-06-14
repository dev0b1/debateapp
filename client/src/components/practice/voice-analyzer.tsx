import { useEffect, useRef } from "react";
import { useVoiceAnalyzer } from "../../hooks/use-voice-analyzer";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Mic, MicOff } from "lucide-react";

interface VoiceAnalyzerProps {
  enableDeepgram?: boolean;
  deepgramApiKey?: string;
}

export function VoiceAnalyzer({ enableDeepgram, deepgramApiKey }: VoiceAnalyzerProps) {
  const {
    audioLevel,
    isRecording,
    voiceMetrics,
    enhancedMetrics,
    deepgramTranscription,
    isAnalyzing,
    startRecording,
    stopRecording,
    toggleMute,
    resetAnalysis,
    hasDeepgramConnection,
    hasEnhancedAnalyzer
  } = useVoiceAnalyzer({
    enableDeepgram,
    deepgramApiKey
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Voice Analysis</span>
          <div className="flex items-center space-x-2">
            {hasDeepgramConnection && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Deepgram Connected
              </Badge>
            )}
            {hasEnhancedAnalyzer && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Enhanced Analysis
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Audio Level Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Level</span>
              <div className="flex items-center space-x-2">
                {isRecording ? (
                  <Mic className="h-4 w-4 text-green-600" />
                ) : (
                  <MicOff className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <Progress value={audioLevel * 100} className="h-2" />
          </div>

          {/* Voice Metrics */}
          {voiceMetrics.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Voice Metrics</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Clarity</div>
                  <div className="text-sm font-medium">
                    {Math.round(voiceMetrics[voiceMetrics.length - 1].clarity * 100)}%
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Pace</div>
                  <div className="text-sm font-medium">
                    {Math.round(voiceMetrics[voiceMetrics.length - 1].pace * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deepgram Transcription */}
          {deepgramTranscription && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Transcription</span>
              <div className="p-2 bg-gray-50 rounded text-sm">
                {deepgramTranscription}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 