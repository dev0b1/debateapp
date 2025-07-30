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
import { useToast } from "../../hooks/use-toast";
import { Square, Mic, MicOff, MessageCircle, Phone, PhoneOff, Settings, Users, Clock } from "lucide-react";
import { VideoRecording } from "./video-recording";
import { QuestionTimer } from "./question-timer";
import { useQuestionSession } from "../../hooks/use-question-session";

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
    publishDefaults: {
      simulcast: false,
      videoSimulcastLayers: [],
      audioPreset: 'music',
      videoPreset: 'none',
      audioCodec: 'opus',
      dtx: false,
      red: false
    }
  }));
  const [error, setError] = useState<string | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const hasConnectedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Question session management
  const {
    currentQuestion: sessionQuestion,
    questionHistory,
    isActive: isQuestionActive,
    questionNumber,
    startQuestion,
    endQuestion,
    addFaceTrackingData,
    startSession,
    endSession,
    getSessionStats,
    getCurrentQuestionInfo,
    shouldEndSession
  } = useQuestionSession({
    maxQuestions: 5,
    defaultDuration: 180000
  });

  // Real-time question updates
  useEffect(() => {
    if (roomData?.roomName) {
      const eventSource = new EventSource(`/api/conversation/current-question/${roomData.roomName}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.question) {
            setCurrentQuestion(data.question);
            setQuestionTimer(0);
          }
        } catch (error) {
          console.error('Error parsing question data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [roomData?.roomName]);

  // Session timer
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  // Question timer
  useEffect(() => {
    if (isConnected && currentQuestion) {
      questionTimerRef.current = setInterval(() => {
        setQuestionTimer(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
    };
  }, [isConnected, currentQuestion]);

    const connect = async () => {
    try {
      console.log("🔗 Connecting to LiveKit room...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log("✅ Microphone access granted");
      
      // Connect to room
      await room.connect(roomData.serverUrl, roomData.token, {
        autoSubscribe: true,
      });
      
      console.log("✅ Connected to room successfully");
      
      // Add a small delay to ensure room properties are available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Safely check room properties
      try {
        console.log("Room properties check:");
        console.log("   - Connection state:", room.connectionState);
        console.log("   - Local participant:", room.localParticipant?.identity);
        console.log("   - Participants:", room.participants?.size || 0);
        console.log("   - Room name:", room.name);
      } catch (error) {
        console.log("Error checking room properties:", error);
      }
      
      // Set up room event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("🔄 Connection state changed:", state);
        setIsConnected(state === ConnectionState.Connected);
        
        switch (state) {
          case ConnectionState.Connected:
            toast({
              title: "Connected!",
              description: "You're now connected to the AI interviewer.",
            });
            break;
          case ConnectionState.Disconnected:
            toast({
              title: "Disconnected",
              description: "Connection to the AI interviewer was lost.",
              variant: "destructive",
            });
            break;
          case ConnectionState.Connecting:
            toast({
              title: "Connecting...",
              description: "Establishing connection to AI interviewer.",
            });
            break;
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("📡 Track subscribed:", track.kind, "from", participant.identity);
        
        if (track.kind === Track.Kind.Audio) {
          toast({
            title: "AI Interviewer Joined",
            description: "Your AI interviewer is now in the room.",
          });
        }
      });

      // Set up audio level monitoring
      const audioTrack = room.localParticipant?.audioTrack;
      if (audioTrack) {
            audioTrackRef.current = audioTrack;
        
        const updateAudioLevel = () => {
          if (audioTrack.mediaStreamTrack) {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioTrack.mediaStreamTrack);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateLevel = () => {
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              const level = Math.min(100, (average / 255) * 100);
              setAudioLevel(level);
              requestAnimationFrame(updateLevel);
            };
            
            updateLevel();
          }
        };
        
        updateAudioLevel();
      }

      setIsConnected(true);
      hasConnectedRef.current = true;
      
    } catch (error) {
      console.error("❌ Connection error:", error);
      setError(error instanceof Error ? error.message : "Failed to connect to room");
      
              toast({
        title: "Connection Failed",
        description: "Failed to connect to the AI interviewer. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!hasConnectedRef.current) {
    connect();
    }
  }, []);

  const toggleMic = () => {
      if (isMicMuted) {
      room.localParticipant?.setMicrophoneEnabled(true);
      setIsMicMuted(false);
      toast({
        title: "Microphone Unmuted",
        description: "Your microphone is now active.",
      });
      } else {
      room.localParticipant?.setMicrophoneEnabled(false);
      setIsMicMuted(true);
      toast({
        title: "Microphone Muted",
        description: "Your microphone is now muted.",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <PhoneOff className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Connection Error</h3>
              <p className="text-red-500 text-sm">{error}</p>
          <Button onClick={() => {
            const sessionStats = getSessionStats();
            console.log('📊 Session Statistics:', sessionStats);
            endSession();
            onEnd();
              }} className="w-full">
            End Session
          </Button>
            </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Connecting...</h3>
              <p className="text-gray-600 text-sm">Establishing connection to AI interviewer</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white font-medium">AI Interview Session</span>
              </div>
              <Badge variant="outline" className="bg-gray-700 text-gray-200 border-gray-600">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(sessionTimer)}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isMicMuted ? "secondary" : "default"} className={isMicMuted ? "bg-red-600" : "bg-green-600"}>
                {isMicMuted ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                {isMicMuted ? "Muted" : "Active"}
              </Badge>
              <Button
                onClick={() => {
                  const sessionStats = getSessionStats();
                  console.log('📊 Session Statistics:', sessionStats);
                  endSession();
                  onEnd();
                }}
                variant="destructive"
                size="sm"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-6xl">
            {/* Video Cards Container */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* AI Interviewer Video Card */}
              <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                {/* Question Heading */}
                {currentQuestion && (
                  <div className="bg-blue-600 px-4 py-3 border-b border-blue-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-lg">Current Question</h3>
                      <Badge variant="outline" className="bg-blue-700 text-blue-100 border-blue-500">
                        {Math.floor(questionTimer / 60)}:{(questionTimer % 60).toString().padStart(2, '0')}
                      </Badge>
                    </div>
                    <p className="text-blue-100 text-sm mt-1">{currentQuestion}</p>
                  </div>
                )}
                
                {/* AI Video Area */}
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                      <Users className="w-16 h-16 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">AI Interviewer</h2>
                      <p className="text-gray-300 text-sm">Listening and responding</p>
                    </div>
                    {/* Audio Level Indicator */}
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" />
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-600">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      Live
                    </Badge>
                  </div>
                </div>
              </div>

              {/* User Video Card */}
              <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                {/* User Video Area */}
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                  <div className="text-center space-y-4">
                    <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                      <Mic className="w-16 h-16 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">You</h2>
                      <p className="text-gray-300 text-sm">Speaking to AI interviewer</p>
                    </div>
                    {/* Audio Level Indicator */}
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" />
                      <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                      <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                  
                  {/* Mic Status */}
                  <div className="absolute top-4 left-4">
                    <Badge className={isMicMuted ? "bg-red-600" : "bg-green-600"}>
                      {isMicMuted ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                      {isMicMuted ? "Muted" : "Active"}
                    </Badge>
                  </div>
                </div>

                {/* Controls Under User Video */}
                <div className="p-4 bg-gray-700 border-t border-gray-600">
                  <div className="space-y-4">
                    {/* Audio Level */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Audio Level</span>
                        <span className="text-gray-400">{Math.round(audioLevel)}%</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex space-x-3">
                      <Button 
                        onClick={toggleMic} 
                        variant={isMicMuted ? "destructive" : "default"}
                        className="flex-1 h-10"
                      >
                        {isMicMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isMicMuted ? "Unmute" : "Mute"}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="flex-1 h-10 border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Info Bar */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Room:</span>
                    <span className="text-gray-200 font-mono">{roomData.roomName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400 font-mono">{room.connectionState}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Participants:</span>
                    <span className="text-gray-200 font-mono">{room.participants?.size || 0}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Session Time:</span>
                  <span className="text-gray-200 font-mono">{formatTime(sessionTimer)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Recording */}
        <VideoRecording 
          roomName={roomData.roomName}
          isActive={isConnected}
          onRecordingComplete={(recordingData) => {
            console.log('Recording completed:', recordingData);
            toast({
              title: "Recording Complete",
              description: `Session recorded for ${recordingData.duration} seconds.`,
            });
          }}
        />

        {/* LiveKit Audio Renderer */}
        <div className="hidden">
          <RoomAudioRenderer />
        </div>

        <ControlBar />
      </div>
    </RoomContext.Provider>
  );
}
