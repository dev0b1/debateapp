import { useState, useRef } from "react";
import { MetricsPanel } from "../components/practice/metrics-panel";
import { FaceTrackingDisplay } from "../components/conversation/face-tracking-display";
import { VoiceAnalysisDisplay } from "../components/conversation/voice-analysis-display";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { useCamera } from "../hooks/use-camera";
import { useVoiceAnalyzer } from "../hooks/use-voice-analyzer";
import { useEyeTracking } from "../hooks/use-eye-tracking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Play, Square, Video, Mic, MicOff, Eye, Brain, Settings, Info } from "lucide-react";
import { EyeTrackingPoint, VoiceMetric } from "@shared/schema";
import { EyeContactMetrics } from "@/lib/mediapipe-utils";
import { FaceTrackingData } from "@/lib/face-tracking-types";

interface SessionData {
  title: string;
  duration: number;
  attentionScore: number;
  voiceClarity: number;
  speakingPace: number;
  volumeLevel: number;
  overallScore: number;
  eyeTrackingData: EyeTrackingPoint[];
  voiceMetrics: VoiceMetric[];
}

function transformToFaceTrackingData(metrics: EyeContactMetrics | null): FaceTrackingData | null {
  if (!metrics) return null;
  
  // Calculate head pose from gaze direction (MediaPipe provides more accurate data)
  const calculateHeadPose = () => {
    const { x, y, z } = metrics.gazeDirection;
    
    // Convert gaze direction to head pose angles
    const yaw = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
    const pitch = Math.atan2(-y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    
    return {
      pitch: Math.max(-45, Math.min(45, pitch)), // Clamp to reasonable range
      yaw: Math.max(-45, Math.min(45, yaw)),
      roll: Math.max(-30, Math.min(30, roll))
    };
  };
  
  return {
    eyeContact: {
      x: metrics.gazeDirection.x,
      y: metrics.gazeDirection.y,
      confidence: metrics.confidence,
      timestamp: Date.now()
    },
    headPose: calculateHeadPose(),
    eyeOpenness: {
      left: metrics.eyeAspectRatio.left,
      right: metrics.eyeAspectRatio.right
    },
    blinkRate: metrics.blinkRate,
    faceLandmarks: [], // MediaPipe landmarks will be provided by the detector
    faceDetected: metrics.confidence > 0.5
  };
}

export default function PracticeSession() {
  const [sessionActive, setSessionActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [title, setTitle] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { 
    videoRef, 
    stream, 
    isVideoEnabled, 
    toggleVideo, 
    startCamera, 
    stopCamera 
  } = useCamera();

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
    getVoiceAnalysisSummary,
    hasDeepgramConnection,
    hasEnhancedAnalyzer
  } = useVoiceAnalyzer({
    enableDeepgram: true,
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY
    // No requireLiveKit: PracticeSession does not use LiveKit
  });

  const { 
    eyeTrackingData, 
    confidence, 
    currentMetrics,
    isInitialized,
    performanceStats
  } = useEyeTracking(videoRef, sessionActive, {
    enableVisualization: true,
    useSimpleDetector: false // Use MediaPipe as primary detector
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: SessionData) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      toast({
        title: "Session Saved",
        description: "Your practice session has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startSession = async () => {
    try {
      await startCamera();
      await startRecording();
      
      setSessionActive(true);
      setStartTime(new Date());
      setSessionTimer(0);
      setTitle(`Practice Session #${new Date().getTime()}`);

      // Start timer
      timerRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);

      toast({
        title: "Session Started",
        description: "Your practice session is now recording.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session. Please check camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopSession = async () => {
    if (!sessionActive || !startTime) return;

    setSessionActive(false);
    stopCamera();
    stopRecording();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculate session metrics with proper type checks
    const duration = sessionTimer;
    const attentionScore = eyeTrackingData?.length > 0 
      ? eyeTrackingData.reduce((sum, data) => sum + (data.confidence ?? 0), 0) / eyeTrackingData.length * 100
      : 0;

    const avgVoiceClarity = voiceMetrics?.length > 0
      ? voiceMetrics.reduce((sum, metric) => sum + (metric.clarity ?? 0), 0) / voiceMetrics.length
      : 0;

    const avgSpeakingPace = voiceMetrics?.length > 0
      ? voiceMetrics.reduce((sum, metric) => sum + (metric.pace ?? 0), 0) / voiceMetrics.length
      : 0;

    const avgVolumeLevel = voiceMetrics?.length > 0
      ? voiceMetrics.reduce((sum, metric) => sum + (metric.volume ?? 0), 0) / voiceMetrics.length
      : 0;

    const overallScore = (attentionScore + avgVoiceClarity + avgSpeakingPace) / 3;

    // Save session with proper type checking
    await createSessionMutation.mutateAsync({
      title,
      duration,
      attentionScore: attentionScore / 100,
      voiceClarity: avgVoiceClarity / 100,
      speakingPace: avgSpeakingPace / 100,
      volumeLevel: avgVolumeLevel / 100,
      overallScore: overallScore / 100,
      eyeTrackingData: eyeTrackingData ?? [],
      voiceMetrics: voiceMetrics ?? []
    });

    // Reset timer
    setSessionTimer(0);
    setStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Practice Session</h2>
          <p className="text-gray-600 mt-1">Improve your communication skills with real-time feedback</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={sessionActive ? stopSession : startSession}
            className={sessionActive 
              ? "bg-red-600 hover:bg-red-700" 
              : "bg-blue-600 hover:bg-blue-700"
            }
            disabled={createSessionMutation.isPending}
          >
            {sessionActive ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Session
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Session
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Session Status */}
      {sessionActive && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-medium">Recording Session</span>
                </div>
                <Badge variant="outline">{formatTime(sessionTimer)}</Badge>
              </div>
              <div className="flex items-center gap-4">
                {isInitialized && (
                  <Badge variant="default" className="bg-green-600">
                    <Eye className="w-3 h-3 mr-1" />
                    Attention to Interviewer Active
                  </Badge>
                )}
                {hasEnhancedAnalyzer && (
                  <Badge variant="default" className="bg-blue-600">
                    <Brain className="w-3 h-3 mr-1" />
                    Enhanced Analysis
                  </Badge>
                )}
                {hasDeepgramConnection && (
                  <Badge variant="default" className="bg-purple-600">
                    <Mic className="w-3 h-3 mr-1" />
                    Deepgram Connected
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed and Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Camera Feed with MediaPipe Overlay */}
          {sessionActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video Feed & Face Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Face tracking overlay canvas */}
                  <canvas
                    id="face-tracking-canvas"
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                    style={{ 
                      maxWidth: '100%',
                      height: 'auto',
                      aspectRatio: '4/3'
                    }}
                  />
                </div>
                {/* Camera Controls */}
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVideo}
                    className="w-12 h-12 rounded-full"
                  >
                    <Video className={`h-5 w-5 ${isVideoEnabled ? 'text-gray-600' : 'text-red-600'}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleMute}
                    className="w-12 h-12 rounded-full"
                  >
                    {isRecording ? (
                      <Mic className="h-5 w-5 text-gray-600" />
                    ) : (
                      <MicOff className="h-5 w-5 text-red-600" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAnalysis}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Reset Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Analysis Tabs */}
          <Tabs defaultValue="face-tracking" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="face-tracking" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Attention to Interviewer
              </TabsTrigger>
              <TabsTrigger value="voice-analysis" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Analysis
              </TabsTrigger>
              <TabsTrigger value="basic-metrics" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Basic Metrics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="face-tracking" className="mt-4">
              <FaceTrackingDisplay
                faceTrackingData={transformToFaceTrackingData(currentMetrics)}
                confidence={confidence}
                isActive={sessionActive}
                videoRef={videoRef}
                performanceStats={performanceStats}
              />
            </TabsContent>
            
            <TabsContent value="voice-analysis" className="mt-4">
              <VoiceAnalysisDisplay
                voiceMetrics={voiceMetrics}
                advancedMetrics={enhancedMetrics}
                deepgramTranscription={deepgramTranscription}
                audioLevel={audioLevel}
                isAnalyzing={isAnalyzing}
                isRecording={isRecording}
                hasDeepgramConnection={hasDeepgramConnection}
                hasAdvancedAnalyzer={hasEnhancedAnalyzer}
              />
            </TabsContent>
            
            <TabsContent value="basic-metrics" className="mt-4">
              <MetricsPanel
                voiceMetrics={voiceMetrics}
                attentionScore={confidence * 100}
                sessionTimer={formatTime(sessionTimer)}
                overallScore={Math.round((confidence * 100 + audioLevel) / 2)}
                isActive={sessionActive}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Real-time Summary Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionActive ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <Badge variant="outline">{formatTime(sessionTimer)}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Attention to Interviewer</span>
                      <Badge variant={confidence > 0.7 ? "default" : confidence > 0.5 ? "secondary" : "destructive"}>
                        Attention to Interviewer
                        <span title="This measures whether your face is visible and well-positioned for the camera, which is important for video interviews. It does not measure true eye contact.">
                          <Info className="inline w-3 h-3 ml-1 text-muted-foreground" />
                        </span>
                        {Math.round(confidence * 100)}%
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Audio Level</span>
                      <Badge variant={audioLevel > 20 ? "default" : "secondary"}>
                        {Math.round(audioLevel)}%
                      </Badge>
                    </div>

                    {currentMetrics && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Head Position</span>
                          <Badge variant="outline">
                            {Math.abs(currentMetrics.gazeDirection.x) < 0.15 ? "Centered" : "Off-center"}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Blink Rate</span>
                          <Badge variant="outline">
                            {Math.round(currentMetrics.blinkRate)}/min
                          </Badge>
                        </div>
                      </>
                    )}

                    {enhancedMetrics && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Voice Clarity</span>
                          <Badge variant={enhancedMetrics.clarity > 75 ? "default" : "secondary"}>
                            {Math.round(enhancedMetrics.clarity)}%
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Emotion</span>
                          <Badge variant="outline" className="capitalize">
                            {enhancedMetrics.emotion.type}
                          </Badge>
                        </div>
                        
                        {enhancedMetrics.fillerWords.words.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Filler Words</span>
                            <Badge variant="destructive">
                              {enhancedMetrics.fillerWords.words.length}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {deepgramTranscription && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Recent Speech</h4>
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-20 overflow-y-auto">
                        {deepgramTranscription.length > 200 
                          ? `${deepgramTranscription.slice(-200)}...`
                          : deepgramTranscription}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start a session to see real-time analysis</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Practice Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Look directly at the camera for attention to interviewer</p>
                <p>• Maintain steady head position</p>
                <p>• Speak clearly and at moderate pace</p>
                <p>• Avoid filler words like "um" and "uh"</p>
                <p>• Keep consistent volume level</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
