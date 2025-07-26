import { 
  RoomAudioRenderer, 
  ControlBar,
  useTracks,
  RoomContext,
  useRoomContext
} from '@livekit/components-react';
import { Room, Track, RoomEvent, TrackEvent, ConnectionState, LocalAudioTrack } from 'livekit-client';
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../../hooks/use-toast";
import { useVoiceAnalyzer } from "../../hooks/use-voice-analyzer";
import { useFaceDetection } from "../../hooks/use-face-detection";
import { MetricsPanel } from "../practice/metrics-panel";
import { FaceTrackingDisplay } from "../conversation/face-tracking-display";
import { VoiceAnalysisDisplay } from "../conversation/voice-analysis-display";
import { useCamera } from "../../hooks/use-camera";
// Removed MediaPipe import - using simple detector instead
import { FaceTrackingData } from "@/lib/face-tracking-types";
import { Play, Square, Video, Mic, MicOff, Eye, Brain, Settings } from "lucide-react";

interface LiveKitRoomProps {
  roomData: {
    roomName: string;
    token: string;
    serverUrl: string;
    topic?: any;
  };
  onEnd: () => void;
}

function transformToFaceTrackingData(eyeTrackingData: any, currentMetrics: any): FaceTrackingData | null {
  if (!eyeTrackingData || !currentMetrics) return null;
  
  // Use data from either server or simple detector
  const metrics = eyeTrackingData.metrics;
  const detectorType = eyeTrackingData.detectorType || 'simple';
  
  return {
    eyeContact: {
      x: metrics.eyeContact.x,
      y: metrics.eyeContact.y,
      confidence: metrics.eyeContact.confidence,
      timestamp: Date.now()
    },
    headPose: {
      pitch: metrics.headPose?.x || 0,
      yaw: metrics.headPose?.y || 0,
      roll: metrics.headPose?.z || 0
    },
    eyeOpenness: {
      left: metrics.eyeAspectRatio.left,
      right: metrics.eyeAspectRatio.right
    },
    blinkRate: metrics.blinkRate,
    faceLandmarks: eyeTrackingData.landmarks || [],
    faceDetected: eyeTrackingData.faceDetected
  };
}

export function LiveKitRoom({ roomData, onEnd }: LiveKitRoomProps) {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    stopLocalTrackOnUnpublish: true
  }));
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Enhanced camera and tracking hooks
  const { 
    stream: cameraStream, 
    isVideoEnabled, 
    toggleVideo, 
    startCamera, 
    stopCamera 
  } = useCamera();

    const {
    faceDirection,
    currentMetrics,
    performanceStats,
    isInitialized: isFaceDetectionInitialized
  } = useFaceDetection(videoRef, isConnected, {
    enableVisualization: true,

  });

  // Enhanced voice analyzer
  const {
    audioLevel: voiceAudioLevel,
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
  });

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        if (mounted) {
          console.log("Connecting to LiveKit room:", roomData);
          await room.connect(roomData.serverUrl, roomData.token);
          console.log("Connected to LiveKit room successfully");

          // Start camera and voice analysis
          await startCamera();
          await startRecording();

          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = new LocalAudioTrack(micStream.getAudioTracks()[0]);
            await room.localParticipant.publishTrack(audioTrack);
            audioTrackRef.current = audioTrack;
            console.log("Published local audio track");

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(micStream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyser.fftSize = 512;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateAudioLevel = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setAudioLevel(Math.round(average));
              requestAnimationFrame(updateAudioLevel);
            };
            updateAudioLevel();
          } catch (micErr) {
            console.error("Mic permission denied or capture failed:", micErr);
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to begin the session.",
              variant: "destructive"
            });
          }

          setIsConnected(true);

          room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log("Track subscribed:", track.kind, "from", participant.identity);
            if (track.kind === Track.Kind.Audio) {
              console.log("Audio track subscribed");
              track.on(TrackEvent.Muted, () => {
                console.log("Audio track muted");
                toast({
                  title: "Audio Muted",
                  description: "The audio track has been muted. Please check your microphone settings.",
                  variant: "destructive"
                });
              });
              track.on(TrackEvent.Unmuted, () => {
                console.log("Audio track unmuted");
              });
            }
          });

          room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log("Track unsubscribed:", track.kind, "from", participant.identity);
            if (track.kind === Track.Kind.Audio) {
              console.log("Audio track unsubscribed");
              toast({
                title: "Audio Disconnected",
                description: "The audio connection has been lost. Attempting to reconnect...",
                variant: "destructive"
              });
            }
          });

          room.on(RoomEvent.ConnectionStateChanged, (state) => {
            console.log("Connection state changed:", state);
            switch (state) {
              case ConnectionState.Connecting:
                toast({ title: "Connecting", description: "Establishing connection to the room..." });
                break;
              case ConnectionState.Connected:
                toast({ title: "Connected", description: "Successfully connected to conversation room." });
                break;
              case ConnectionState.Disconnected:
                toast({
                  title: "Disconnected",
                  description: "Lost connection to the room. Attempting to reconnect...",
                  variant: "destructive"
                });
                break;
              case ConnectionState.Reconnecting:
                toast({
                  title: "Reconnecting",
                  description: "Attempting to reconnect to the room...",
                  variant: "destructive"
                });
                break;
            }
          });

          timerRef.current = setInterval(() => {
            setSessionTimer(prev => prev + 1);
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to connect to room:", error);
        setError("Failed to connect to conversation room");
        toast({
          title: "Connection Error",
          description: "Failed to connect to conversation room. Please try again.",
          variant: "destructive"
        });
      }
    };
    connect();

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopCamera();
      stopRecording();
      room.disconnect();
    };
  }, [room, roomData.serverUrl, roomData.token, toast, startCamera, stopCamera, startRecording, stopRecording]);

  const toggleMic = () => {
    const track = audioTrackRef.current;
    if (track) {
      if (isMicMuted) {
        track.unmute();
      } else {
        track.mute();
      }
      setIsMicMuted(!isMicMuted);
    }
    toggleMute();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  if (!isConnected) {
    return (
      <Card className="p-4">
        <CardContent>
          <p>Connecting to conversation room...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="h-full space-y-6">
        {/* Session Status */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium">AI Conversation Active</span>
                </div>
                <Badge variant="outline">{formatTime(sessionTimer)}</Badge>
                {roomData.topic && (
                  <Badge variant="outline" className="capitalize">
                    {roomData.topic.difficulty} - {roomData.topic.title}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                {isEyeTrackingInitialized && (
                  <Badge variant="default" className="bg-green-600">
                    <Eye className="w-3 h-3 mr-1" />
                    Eye Tracking Active
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed and Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Camera Feed with MediaPipe Overlay */}
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
                    onClick={toggleMic}
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

            {/* Enhanced Analysis Tabs */}
            <Tabs defaultValue="face-tracking" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="face-tracking" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Face Tracking
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
                  faceTrackingData={transformToFaceTrackingData(eyeTrackingData, currentMetrics)}
                  confidence={confidence}
                  isActive={isConnected}
                  videoRef={videoRef}
                  performanceStats={performanceStats}
                />
              </TabsContent>
              
              <TabsContent value="voice-analysis" className="mt-4">
                <VoiceAnalysisDisplay
                  voiceMetrics={voiceMetrics}
                  advancedMetrics={enhancedMetrics}
                  deepgramTranscription={deepgramTranscription}
                  audioLevel={voiceAudioLevel}
                  isAnalyzing={isAnalyzing}
                  isRecording={isRecording}
                  hasDeepgramConnection={hasDeepgramConnection}
                  hasAdvancedAnalyzer={hasEnhancedAnalyzer}
                />
              </TabsContent>
              
              <TabsContent value="basic-metrics" className="mt-4">
                <MetricsPanel
                  voiceMetrics={voiceMetrics}
                  eyeContactScore={confidence * 100}
                  sessionTimer={formatTime(sessionTimer)}
                  overallScore={Math.round((confidence * 100 + voiceAudioLevel) / 2)}
                  isActive={isConnected}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Real-time Summary Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <Badge variant="outline">{formatTime(sessionTimer)}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Eye Contact</span>
                    <Badge variant={confidence > 0.7 ? "default" : confidence > 0.5 ? "secondary" : "destructive"}>
                      {Math.round(confidence * 100)}%
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Audio Level</span>
                    <Badge variant={voiceAudioLevel > 20 ? "default" : "secondary"}>
                      {Math.round(voiceAudioLevel)}%
                    </Badge>
                  </div>

                  {currentMetrics && (
                    <>
                                              <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Head Position</span>
                          <Badge variant="outline">
                            {Math.abs(currentMetrics.headPose?.y || 0) < 15 ? "Centered" : "Off-center"}
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
              </CardContent>
            </Card>

            {/* Conversation Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversation Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Maintain eye contact with the camera</p>
                  <p>• Speak clearly and at a moderate pace</p>
                  <p>• Listen actively and respond naturally</p>
                  <p>• Avoid filler words like "um" and "uh"</p>
                  <p>• Keep your head centered and steady</p>
                </div>
              </CardContent>
            </Card>

            {/* End Session Button */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={onEnd}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="mr-2 h-4 w-4" />
                  End Conversation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LiveKit Audio Renderer and Controls */}
        <div className="relative">
          <RoomAudioRenderer />
        </div>

        <ControlBar />
      </div>
    </RoomContext.Provider>
  );
}
