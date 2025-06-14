import {
  LiveKitRoom as LiveKitRoomComponent,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
  RoomContext,
  useRoomContext
} from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ConversationTopic } from "@shared/schema";
import { useToast } from "../../hooks/use-toast";
import { useVoiceAnalyzer } from "../../hooks/use-voice-analyzer";
import { useEyeTracking } from "../../hooks/use-eye-tracking";
import { FaceTrackingDisplay } from "./face-tracking-display";
import { MetricsPanel } from "../practice/metrics-panel";

interface LiveKitRoomProps {
  roomData: {
    roomName: string;
    token: string;
    serverUrl: string;
  };
  topic: ConversationTopic;
  onEnd: () => void;
}

export function LiveKitRoom({ roomData, topic, onEnd }: LiveKitRoomProps) {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Get audio track from LiveKit
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );
  const audioTrack = tracks.find(track => track.source === Track.Source.Microphone);

  // Voice and eye tracking hooks
  const { 
    audioLevel, 
    voiceMetrics, 
    startRecording,
    stopRecording
  } = useVoiceAnalyzer({
    enableDeepgram: true,
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,
    livekitAudioTrack: audioTrack
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    eyeTrackingData, 
    confidence,
    currentMetrics,
    isInitialized,
    performanceStats
  } = useEyeTracking(videoRef, true, {
    enableVisualization: true,
    useSimpleDetector: false
  });

  // Connect to room
  useEffect(() => {
    let mounted = true;
    
    const connect = async () => {
      try {
        if (mounted) {
          await room.connect(roomData.serverUrl, roomData.token);
          toast({
            title: "Connected",
            description: "Successfully connected to conversation room.",
          });
          
          // Start voice analysis when audio track is available
          if (audioTrack) {
            startRecording();
          }
          
          // Start session timer
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
      stopRecording();
      room.disconnect();
    };
  }, [room, roomData.serverUrl, roomData.token, toast, startRecording, stopRecording, audioTrack]);

  // Format time
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

  return (
    <RoomContext.Provider value={room}>
      <div className="h-full space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <MyVideoConference videoRef={videoRef} />
          </div>
          <div className="lg:col-span-1">
            <MetricsPanel
              voiceMetrics={voiceMetrics}
              eyeContactScore={confidence * 100}
              sessionTimer={formatTime(sessionTimer)}
              overallScore={Math.round((confidence * 100 + audioLevel) / 2)}
              isActive={true}
            />
          </div>
        </div>
        
        <RoomAudioRenderer />
        <ControlBar />
        
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={onEnd}
          >
            End Session
          </Button>
        </div>
      </div>
    </RoomContext.Provider>
  );
}

interface MyVideoConferenceProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

function MyVideoConference({ videoRef }: MyVideoConferenceProps) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="relative">
      <GridLayout 
        tracks={tracks} 
        className="h-[calc(100vh-var(--lk-control-bar-height)-8rem)]"
      >
        <ParticipantTile />
      </GridLayout>
      
      {/* Face tracking overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover opacity-0"
        />
        <canvas
          id="face-tracking-canvas"
          className="absolute inset-0 w-full h-full"
          width={640}
          height={480}
        />
      </div>
    </div>
  );
}