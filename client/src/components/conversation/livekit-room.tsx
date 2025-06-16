import { 
  RoomAudioRenderer, 
  ControlBar,
  useTracks,
  RoomContext,
  useRoomContext
} from '@livekit/components-react';
import { Room, Track, RoomEvent, TrackEvent, ConnectionState, LocalAudioTrack } from 'livekit-client';
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/use-toast";
import { useVoiceAnalyzer } from "../../hooks/use-voice-analyzer";
import { useEyeTracking } from "../../hooks/use-eye-tracking";
import { MetricsPanel } from "../practice/metrics-panel";
import { FaceTrackingDisplay } from "../conversation/face-tracking-display";
import { useCamera } from "../../hooks/use-camera";
import { EyeContactMetrics } from "@/lib/mediapipe-utils";
import { FaceTrackingData } from "@/lib/face-tracking-types";

interface LiveKitRoomProps {
  roomData: {
    roomName: string;
    token: string;
    serverUrl: string;
  };
  onEnd: () => void;
}

function transformToFaceTrackingData(metrics: EyeContactMetrics | null): FaceTrackingData | null {
  if (!metrics) return null;

  const calculateHeadPose = () => {
    const { x, y, z } = metrics.gazeDirection;
    const yaw = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
    const pitch = Math.atan2(-y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);

    return {
      pitch: Math.max(-45, Math.min(45, pitch)),
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
    faceLandmarks: [],
    faceDetected: metrics.confidence > 0.5
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

  const { stream: cameraStream } = useCamera();
  const { 
    eyeTrackingData,
    confidence,
    currentMetrics,
    performanceStats,
    isInitialized: isEyeTrackingInitialized
  } = useEyeTracking(videoRef, isConnected, {
    enableVisualization: true,
    performanceMode: true
  });

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        if (mounted) {
          console.log("Connecting to LiveKit room:", roomData);
          await room.connect(roomData.serverUrl, roomData.token);
          console.log("Connected to LiveKit room successfully");

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
      room.disconnect();
    };
  }, [room, roomData.serverUrl, roomData.token, toast]);

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
      <div className="h-full space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              id="face-tracking-canvas"
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            />
            {isEyeTrackingInitialized && (
              <FaceTrackingDisplay
                faceTrackingData={transformToFaceTrackingData(currentMetrics)}
                confidence={confidence}
                isActive={isConnected}
                videoRef={videoRef}
                performanceStats={performanceStats}
              />
            )}
          </div>

          <div>
            <ConversationMetrics 
              sessionTimer={formatTime(sessionTimer)}
              onEnd={onEnd}
              eyeContactScore={currentMetrics?.attentionScore || 0}
              audioLevel={audioLevel}
              isMicMuted={isMicMuted}
              toggleMic={toggleMic}
            />
          </div>
        </div>

        <div className="relative">
          <RoomAudioRenderer />
        </div>

        <ControlBar />
      </div>
    </RoomContext.Provider>
  );
}

interface ConversationMetricsProps {
  sessionTimer: string;
  onEnd: () => void;
  eyeContactScore: number;
  audioLevel: number;
  isMicMuted: boolean;
  toggleMic: () => void;
}

function ConversationMetrics({ sessionTimer, onEnd, eyeContactScore, audioLevel, isMicMuted, toggleMic }: ConversationMetricsProps) {
  const { 
    voiceMetrics, 
    startRecording,
    stopRecording
  } = useVoiceAnalyzer({
    enableDeepgram: true,
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY
  });

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
  }, [startRecording, stopRecording]);

  return (
    <>
      <MetricsPanel
        voiceMetrics={voiceMetrics}
        eyeContactScore={eyeContactScore}
        sessionTimer={sessionTimer}
        overallScore={Math.round(audioLevel)}
        isActive={true}
      />
      <div className="flex justify-between mt-4">
        <Button onClick={toggleMic} variant="secondary">
          {isMicMuted ? "Unmute Mic" : "Mute Mic"}
        </Button>
        <Button variant="destructive" onClick={onEnd}>
          End Session
        </Button>
      </div>
    </>
  );
}
