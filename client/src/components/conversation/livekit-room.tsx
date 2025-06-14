import { useEffect, useState, useRef, useCallback } from "react";
import { 
  LiveKitRoom as LiveKitRoomComponent, 
  RoomAudioRenderer, 
  useParticipants
} from "@livekit/components-react";
import { Track, Room, VideoPresets } from "livekit-client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { ConversationTopic } from "@shared/schema";
import { Mic, MicOff, Eye, Headphones } from "lucide-react";
import { useCamera } from "../../hooks/use-camera";
import { useVoiceAnalyzer } from "../../hooks/use-voice-analyzer";
import { useEyeTracking } from "../../hooks/use-eye-tracking";
import { CameraFeed } from "../practice/camera-feed";
import { FaceTrackingDisplay } from "../conversation/face-tracking-display";
import { MetricsPanel } from "../practice/metrics-panel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { EyeContactMetrics } from "@/lib/mediapipe-utils";
import { FaceTrackingData } from "@/lib/face-tracking-types";

interface LiveKitRoomProps {
  roomData: {
    roomName: string;
    token: string;
    serverUrl: string;
  };
  topic: ConversationTopic;
  onEnd: () => void;
}

interface RoomContentProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isConnected: boolean;
  conversationStarted: boolean;
  eyeTrackingData: any;
  confidence: number;
  currentMetrics: any;
  performanceStats: any;
  sessionTimer: number;
  formatTime: (seconds: number) => string;
  audioLevel: number;
  voiceMetrics: any;
  isMuted: boolean;
  toggleMute: () => void;
  onEnd: () => void;
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

function RoomContent(props: RoomContentProps) {
  const participants = useParticipants();
  const aiParticipant = participants.find(p => p.identity === "ai-agent");

  // Transform eye tracking data to face tracking format
  const faceTrackingData = transformToFaceTrackingData(props.currentMetrics);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2 space-y-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Camera Feed & Face Tracking
                {props.conversationStarted && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-600">Active</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={props.videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Face tracking overlay canvas */}
                <canvas
                  id="face-tracking-canvas"
                  className="absolute inset-0 w-full h-full"
                  width={640}
                  height={480}
                />

                {/* No video placeholder */}
                {!props.videoRef.current?.srcObject && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-lg">Camera feed will appear here</p>
                      <p className="text-sm opacity-75 mt-1">Grant camera permission to start</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <FaceTrackingDisplay
            videoRef={props.videoRef}
            isActive={props.conversationStarted}
            faceTrackingData={faceTrackingData}
            confidence={props.confidence}
            performanceStats={props.performanceStats}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center">
                <Headphones className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                AI Conversation Audio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={props.toggleMute}
                  className="w-12 h-12 rounded-full"
                >
                  {props.isMuted ? (
                    <MicOff className="h-5 w-5 text-red-600" />
                  ) : (
                    <Mic className="h-5 w-5 text-gray-600" />
                  )}
                </Button>
                
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {props.isConnected ? 'Connected to AI Agent' : 'Connecting...'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Real-time conversation analysis active
                  </p>
                </div>
              </div>
              
              {/* Voice Activity Visualization */}
              {aiParticipant && (
                <div className="mt-4">
                  <div className="h-8 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-200"
                      style={{ 
                        width: `${(props.audioLevel || 0) * 100}%`,
                        opacity: props.isConnected ? 1 : 0.5
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metrics Panel */}
        <div className="lg:col-span-1">
          <MetricsPanel
            voiceMetrics={props.voiceMetrics}
            eyeContactScore={props.confidence * 100}
            sessionTimer={props.formatTime(props.sessionTimer)}
            overallScore={Math.round((props.confidence * 100 + props.audioLevel) / 2)}
            isActive={props.conversationStarted}
          />
        </div>
      </div>

      {/* End Session Button */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          onClick={props.onEnd}
        >
          End Session
        </Button>
      </div>
    </div>
  );
}

export function LiveKitRoom({ roomData, topic, onEnd }: LiveKitRoomProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const [room, setRoom] = useState<Room | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Camera and analysis hooks
  const { 
    videoRef: cameraRef, 
    startCamera, 
    stopCamera
  } = useCamera();
  
  const { 
    eyeTrackingData, 
    confidence,
    currentMetrics,
    isInitialized,
    performanceStats
  } = useEyeTracking(videoRef, conversationStarted, {
    enableVisualization: true,
    useSimpleDetector: false // Use MediaPipe as primary detector, same as practice session
  });
  
  const { 
    audioLevel, 
    voiceMetrics, 
    startRecording,
    stopRecording
  } = useVoiceAnalyzer({
    enableDeepgram: true,
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY
  });

  // End conversation mutation
  const endConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversation/end", { roomName: roomData.roomName });
      return response.json();
    },
    onSuccess: () => {
      cleanup();
      onEnd();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to end conversation. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopCamera();
    stopRecording();
    setConversationStarted(false);
    if (room) {
      room.disconnect();
    }
  }, [stopCamera, stopRecording, room]);

  // Handle room connection
  const handleConnected = useCallback(async () => {
    try {
      setIsConnected(true);
      setConversationStarted(true);
      
      // Start camera and tracking
      if (videoRef.current) {
        await startCamera();
      }
      
      // Start voice analysis
      startRecording();
      
      // Start session timer
      timerRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error in handleConnected:", error);
      setError("Failed to initialize camera and tracking");
      toast({
        title: "Error",
        description: "Failed to initialize camera and tracking. Please check your permissions.",
        variant: "destructive"
      });
    }
  }, [startCamera, startRecording, toast]);

  // Handle room disconnection
  const handleDisconnected = useCallback(() => {
    cleanup();
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Connection to the conversation room was lost.",
      variant: "destructive"
    });
  }, [cleanup, toast]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error("LiveKit room error:", error);
    
    // Check for specific error types and provide helpful messages
    let errorMessage = error.message;
    if (error.message.includes('TURN server') || error.message.includes('ICE failed')) {
      errorMessage = "Connection failed due to network restrictions. This may be due to firewall settings or LiveKit configuration issues.";
    } else if (error.message.includes('could not establish pc connection')) {
      errorMessage = "Unable to establish WebRTC connection. Please check your internet connection and try again.";
    } else if (error.message.includes('authentication')) {
      errorMessage = "Authentication failed. Please check your LiveKit credentials.";
    }
    
    setError(errorMessage);
    toast({
      title: "Connection Error",
      description: errorMessage,
      variant: "destructive"
    });
  }, [toast]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (room) {
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (audioTrack) {
        if (isMuted) {
          room.localParticipant.setMicrophoneEnabled(true);
        } else {
          room.localParticipant.setMicrophoneEnabled(false);
        }
        setIsMuted(!isMuted);
      }
    }
  }, [room, isMuted]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (error) {
    return (
      <Card className="p-4">
        <CardContent>
          <p className="text-red-500">{error}</p>
          <Button onClick={onEnd} className="mt-4">
            End Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <LiveKitRoomComponent
      serverUrl={roomData.serverUrl}
      token={roomData.token}
      connect={true}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={handleError}
      options={{
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [
            VideoPresets.h180,
            VideoPresets.h360,
            VideoPresets.h720
          ]
        },
        adaptiveStream: true,
        dynacast: true
      }}
    >
      <RoomAudioRenderer />
      <RoomContent
        videoRef={videoRef}
        isConnected={isConnected}
        conversationStarted={conversationStarted}
        eyeTrackingData={eyeTrackingData}
        confidence={confidence}
        currentMetrics={currentMetrics}
        performanceStats={performanceStats}
        sessionTimer={sessionTimer}
        formatTime={formatTime}
        audioLevel={audioLevel}
        voiceMetrics={voiceMetrics}
        isMuted={isMuted}
        toggleMute={toggleMute}
        onEnd={() => endConversationMutation.mutate()}
      />
    </LiveKitRoomComponent>
  );
}