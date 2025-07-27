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
import { VoiceAnalysisDisplay } from "../conversation/voice-analysis-display";
import { Play, Square, Mic, MicOff, Settings } from "lucide-react";

interface LiveKitRoomProps {
  roomData: {
    roomName: string;
    token: string;
    serverUrl: string;
    topic?: any;
  };
  onEnd: () => void;
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
    stopLocalTrackOnUnpublish: true,
    // Audio settings for good quality
    publishDefaults: {
      simulcast: false,
      videoSimulcastLayers: [],
      audioPreset: 'music', // Back to music for better quality
      videoPreset: 'none'
    }
  }));
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const hasConnectedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  // Enhanced voice analyzer
  const {
    audioLevel: voiceAudioLevel,
    isRecording,
    voiceMetrics,
    isSpeaking,
    sessionRecording,
    isAnalyzing,
    startRecording,
    stopRecording,
    toggleMute,
    resetAnalysis,
    getVoiceAnalysisSummary,
    getSessionFeedback
  } = useVoiceAnalyzer({
    enableSessionRecording: true
  });

    useEffect(() => {
    let mounted = true;
    let isConnecting = false; // Prevent multiple simultaneous connections

    // Don't connect if already connected
    if (isConnected || hasConnectedRef.current) {
      console.log("🔄 Skipping useEffect - already connected");
      return;
    }

    const connect = async () => {
      if (isConnecting) {
        console.log("🔄 Already connecting, skipping...");
        return;
      }
      
      // Check if already connected or connecting
      if (room.connectionState === ConnectionState.Connected || 
          room.connectionState === ConnectionState.Connecting) {
        console.log(`✅ Room is ${room.connectionState}, skipping connection...`);
        return;
      }
      
      // Check if we've already connected once
      if (hasConnectedRef.current) {
        console.log("✅ Already connected once, skipping reconnection...");
        return;
      }
      
      // Check if we're already connected via state
      if (isConnected) {
        console.log("✅ Already connected via state, skipping connection...");
        return;
      }
      
      console.log("🚀 Starting fresh connection...");
      isConnecting = true;
      
      try {
        if (mounted) {
          console.log("Connecting to LiveKit room:", roomData);
          
          // First, get microphone permission and create audio track
          let micStream: MediaStream | null = null;
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              } 
            });
            console.log("Microphone access granted");
          } catch (micErr) {
            console.error("Mic permission denied or capture failed:", micErr);
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to begin the session.",
              variant: "destructive"
            });
            return;
          }

          // Connect to LiveKit room with timeout
          console.log("Connecting to LiveKit room...");
          const connectPromise = room.connect(roomData.serverUrl, roomData.token);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 30000)
          );
          
          await Promise.race([connectPromise, timeoutPromise]);
          console.log("✅ Connected to LiveKit room successfully");
          console.log("Connection state:", room.connectionState);
          console.log("Room name:", room.name);
          console.log("Local participant:", room.localParticipant?.identity);

          // Now publish the audio track
          try {
            if (audioTrackRef.current) {
              console.log("🔄 Audio track already exists, stopping old one...");
              audioTrackRef.current.stop();
              audioTrackRef.current = null;
            }
            
            const audioTrack = new LocalAudioTrack(micStream.getAudioTracks()[0]);
            await room.localParticipant.publishTrack(audioTrack);
            audioTrackRef.current = audioTrack;
            console.log("✅ Published local audio track");

            // Set up audio level monitoring using the same stream
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext();
              console.log("🎤 Audio context created for level monitoring");
            }
            const audioContext = audioContextRef.current;
            const source = audioContext.createMediaStreamSource(micStream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyser.fftSize = 512;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateAudioLevel = () => {
              if (mounted) {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                setAudioLevel(Math.round(average));
                requestAnimationFrame(updateAudioLevel);
              }
            };
            updateAudioLevel();
          } catch (publishErr) {
            console.error("Error publishing audio track:", publishErr);
            toast({
              title: "Audio Track Error",
              description: "Failed to publish audio track. Please try again.",
              variant: "destructive"
            });
            return;
          }

          // Start voice analysis after successful connection
          await startRecording();
          setIsConnected(true);
          hasConnectedRef.current = true; // Mark as connected
          
          // Wait for room to be ready and check for AI agent
          console.log("Waiting for room to be ready...");
          await new Promise<void>((resolve) => {
            const checkRoomReady = () => {
              if (room.participants !== undefined) {
                console.log("✅ Room is ready");
                resolve();
              } else {
                console.log("⏳ Room not ready yet, waiting...");
                setTimeout(checkRoomReady, 100);
              }
            };
            checkRoomReady();
          });
          
          console.log("Checking for AI agent...");
          const participants = Array.from(room.participants!.values());
          console.log("Current participants:", participants.map(p => p.identity));
          
          const aiAgent = participants.find(p => p.identity === 'ai-agent');
          if (aiAgent) {
            console.log("✅ AI agent already in room:", aiAgent.identity);
          } else {
            console.log("⏳ AI agent not yet in room, will join shortly...");
          }

          room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log("Track subscribed:", track.kind, "from", participant.identity);
            if (track.kind === Track.Kind.Audio) {
              console.log("Audio track subscribed from:", participant.identity);
              
              // Check if this is the AI agent speaking
              if (participant.identity === 'ai-agent') {
                console.log("🎤 AI agent audio track subscribed - should hear welcome message soon!");
                toast({
                  title: "AI Agent Connected",
                  description: "The AI interviewer has joined. You should hear a welcome message shortly.",
                });
                
                // Monitor audio quality
                track.on(TrackEvent.AudioLevelChanged, (level) => {
                  console.log("🔊 AI agent audio level:", level);
                });
                
                track.on(TrackEvent.Muted, () => {
                  console.log("🔇 AI agent audio muted");
                });
                
                track.on(TrackEvent.Unmuted, () => {
                  console.log("🔊 AI agent audio unmuted");
                });
              }
              
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
            console.log("Room URL:", roomData.serverUrl);
            console.log("Room name:", room.name);
            console.log("Local participant:", room.localParticipant?.identity);
            
            // Log connection quality
            if (state === ConnectionState.Connected) {
              console.log("📊 Connection quality info:");
              console.log("   - Room URL:", roomData.serverUrl);
              console.log("   - Connection state:", room.connectionState);
              console.log("   - Participants:", room.participants?.size || 0);
            }
            
            switch (state) {
              case ConnectionState.Connecting:
                toast({ title: "Connecting", description: "Establishing connection to the room..." });
                break;
              case ConnectionState.Connected:
                toast({ title: "Connected", description: "Successfully connected to conversation room." });
                console.log("✅ Room connected successfully");
                console.log("Participants:", room.participants.size);
                break;
              case ConnectionState.Disconnected:
                toast({
                  title: "Disconnected",
                  description: "Lost connection to the room. Attempting to reconnect...",
                  variant: "destructive"
                });
                console.log("❌ Room disconnected");
                break;
              case ConnectionState.Reconnecting:
                toast({
                  title: "Reconnecting",
                  description: "Attempting to reconnect to the room...",
                  variant: "destructive"
                });
                console.log("🔄 Room reconnecting");
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
        
        // Clean up on connection failure
        if (audioTrackRef.current) {
          audioTrackRef.current.stop();
          audioTrackRef.current = null;
        }
        if (room.connectionState !== ConnectionState.Disconnected) {
          room.disconnect();
        }
      } finally {
        isConnecting = false; // Always reset connection flag
      }
    };
    connect();

    return () => {
      mounted = false;
      isConnecting = false; // Reset connection flag
      hasConnectedRef.current = false; // Reset connection ref
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      stopRecording();
      if (room.connectionState !== ConnectionState.Disconnected) {
        room.disconnect();
      }
    };
  }, [room, roomData.serverUrl, roomData.token]);

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
                <Badge variant="default" className="bg-green-600">
                  <Mic className="w-3 h-3 mr-1" />
                  Voice Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Analysis */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceAnalysisDisplay
                  voiceMetrics={voiceMetrics}
                  audioLevel={voiceAudioLevel}
                  isAnalyzing={isAnalyzing}
                  isRecording={isRecording}
                  isSpeaking={isSpeaking}
                />
              </CardContent>
            </Card>
          </div>

          {/* Conversation Summary */}
          <div>
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
                    <span className="text-sm text-muted-foreground">Audio Level</span>
                    <Badge variant={voiceAudioLevel > 20 ? "default" : "secondary"}>
                      {Math.round(voiceAudioLevel)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* End Session Button */}
            <Card className="mt-6">
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
