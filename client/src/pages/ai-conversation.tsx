import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Users, 
  MessageCircle, 
  Settings, 
  AlertTriangle, 
  Mic, 
  Briefcase,
  User,
  Target,
  Sparkles,
  Eye,
  Video,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/use-camera";
import { useFaceDetection } from "@/hooks/use-face-detection";
import { useVoiceAnalyzer } from "@/hooks/use-voice-analyzer";
import { FaceTrackingDisplay } from "@/components/conversation/face-tracking-display";
import { VoiceAnalysisDisplay } from "@/components/conversation/voice-analysis-display";
import { SessionFeedback } from "@/components/conversation/session-feedback";
import { FaceTrackingData } from "@/lib/face-tracking-types";
import { LiveKitRoom } from "@/components/conversation/livekit-room";

interface InterviewSession {
  id: string;
  type: string;
  context?: string;
  currentQuestion?: string;
}

// Interview types
const interviewTypes = [
  { value: 'general', label: 'General Interview', description: 'Common interview questions for any role' },
  { value: 'behavioral', label: 'Behavioral Interview', description: 'STAR method and situational questions' },
  { value: 'technical', label: 'Technical Interview', description: 'Technical skills and problem solving' },
  { value: 'leadership', label: 'Leadership Interview', description: 'Management and leadership scenarios' },
  { value: 'culture-fit', label: 'Culture Fit Interview', description: 'Values, motivation, and company alignment' },
  { value: 'case-study', label: 'Case Study Interview', description: 'Business case analysis and strategy' },
  { value: 'product', label: 'Product Interview', description: 'Product strategy and user experience' },
  { value: 'sales', label: 'Sales Interview', description: 'Client relationships and objection handling' }
];

export default function AIConversation() {
  const [selectedInterviewType, setSelectedInterviewType] = useState('');
  const [interviewContext, setInterviewContext] = useState('');
  const [isInConversation, setIsInConversation] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const processingRef = useRef<string | null>(null);
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async (sessionData: InterviewSession) => {
      // Simulate room creation with interview context
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { 
        roomId: `room-${sessionData.type}-${Date.now()}`, 
        sessionData,
        currentQuestion: "Tell me about yourself and your background."
      };
    },
    onSuccess: (data) => {
      setRoomData(data);
      setCurrentQuestion(data.currentQuestion);
      setIsInConversation(true);
      setProcessing(false);
      processingRef.current = null;
      toast({
        title: "Interview Started!",
        description: "Your AI interviewer is ready. Good luck!",
      });
    },
    onError: (error) => {
      setProcessing(false);
      processingRef.current = null;
      toast({
        title: "Failed to start interview",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  });

  const startInterview = () => {
    if (!selectedInterviewType) {
      toast({
        title: "Select Interview Type",
        description: "Please choose an interview type to continue.",
        variant: "destructive",
      });
      return;
    }

    const sessionData: InterviewSession = {
      id: `interview-${Date.now()}`,
      type: selectedInterviewType,
      context: interviewContext || undefined
    };

    setProcessing(true);
    processingRef.current = sessionData.id;
    createRoomMutation.mutate(sessionData);
  };

  const endConversation = () => {
    setIsInConversation(false);
    setRoomData(null);
    setSelectedInterviewType('');
    setInterviewContext('');
    setCurrentQuestion('');
    setProcessing(false);
    processingRef.current = null;
  };

  const getInterviewTypeInfo = (type: string) => {
    return interviewTypes.find(t => t.value === type);
  };

  // Helper to transform face detection data
  function transformToFaceTrackingData(faceDirection: any, currentMetrics: any): FaceTrackingData | null {
    if (!faceDirection || !currentMetrics) return null;
    
    return {
      faceDetected: faceDirection.faceDetected,
      confidence: faceDirection.confidence,
      direction: faceDirection.direction,
      headPose: {
        x: currentMetrics.headPose?.x || 0,
        y: currentMetrics.headPose?.y || 0,
        z: currentMetrics.headPose?.z || 0
      },
      timestamp: Date.now()
    };
  }

  if (isInConversation && roomData) {
    // Face analysis hooks
    const {
      videoRef,
      isVideoEnabled,
      startCamera,
      stopCamera,
      toggleVideo
    } = useCamera();

    const {
      faceDirection,
      currentMetrics,
      isInitialized,
      performanceStats
    } = useFaceDetection(videoRef, true, {
      enableVisualization: true
    });

    // Voice analysis hook
    const {
      audioLevel,
      isRecording,
      voiceMetrics,
      isAnalyzing,
      isSpeaking,
      sessionRecording: voiceSessionRecording,
      startRecording,
      stopRecording,
      toggleMute,
      resetAnalysis,
      getVoiceAnalysisSummary,
      getSessionFeedback
    } = useVoiceAnalyzer({
      enableSessionRecording: true
    });

    // Start camera and voice recording on mount, stop on unmount
    useEffect(() => {
      startCamera();
      startRecording();
      return () => {
        stopCamera();
        stopRecording();
      };
    }, [startCamera, stopCamera, startRecording, stopRecording]);

    const interviewTypeInfo = getInterviewTypeInfo(roomData.sessionData.type);

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Interview</h2>
            <p className="text-gray-600 mt-1">{interviewTypeInfo?.label}</p>
            {roomData.sessionData.context && (
              <p className="text-sm text-gray-500 mt-1">Context: {roomData.sessionData.context}</p>
            )}
          </div>
          <Button 
            onClick={() => {
              // Stop recording and get session feedback
              stopRecording();
              
              // Get session feedback data
              const feedback = getSessionFeedback();
              if (feedback) {
                setSessionRecording(feedback);
                setShowFeedback(true);
              }
              
              endConversation();
            }}
            variant="destructive"
          >
            End Interview
          </Button>
        </div>

        {/* Current Question Display */}
        {currentQuestion && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Current Question</h3>
                  <p className="text-blue-800">{currentQuestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Face Detection */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Face Detection
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
                  {/* Face tracking overlay */}
                  <FaceTrackingDisplay
                    faceTrackingData={transformToFaceTrackingData(faceDirection, currentMetrics)}
                    confidence={faceDirection.confidence}
                    isActive={true}
                    videoRef={videoRef}
                    performanceStats={performanceStats}
                  />
                </div>
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVideo}
                    className="w-12 h-12 rounded-full"
                  >
                    <Video className={`h-5 w-5 ${isVideoEnabled ? 'text-gray-600' : 'text-red-600'}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

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
                  audioLevel={audioLevel}
                  isAnalyzing={isAnalyzing}
                  isRecording={isRecording}
                  isSpeaking={isSpeaking}
                />
              </CardContent>
            </Card>
          </div>

          {/* AI Interview */}
          <div>
            <LiveKitRoom 
              roomData={roomData}
              onEnd={endConversation}
            />
          </div>
        </div>

        {/* Session Feedback */}
        {showFeedback && sessionRecording && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Interview Feedback & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SessionFeedback
                  sessionData={sessionRecording}
                  videoRef={videoRef}
                  onTimestampClick={(timestamp) => {
                    if (videoRef?.current) {
                      videoRef.current.currentTime = timestamp / 1000;
                      videoRef.current.play();
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Interview Practice</h2>
        <p className="text-gray-600 mt-1">Practice real interviews with AI partners on various topics</p>
      </div>

      {/* Setup Required Banner */}
      {setupRequired && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Setup Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="space-y-2">
              <p>AI interview features require API keys to be configured. You can still use other features like face tracking and voice analysis in demo mode.</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  <Settings className="mr-2 h-4 w-4" />
                  View Setup Guide
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSetupRequired(false)}
                  className="text-amber-600 hover:bg-amber-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Interview Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Interview Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="interview-type">Interview Type</Label>
              <Select value={selectedInterviewType} onValueChange={setSelectedInterviewType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interview type" />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="context">Context (Optional)</Label>
              <Input
                id="context"
                placeholder="e.g., Senior role, startup environment, remote team"
                value={interviewContext}
                onChange={(e) => setInterviewContext(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="detailed-context">Additional Context (Optional)</Label>
            <Textarea
              id="detailed-context"
              placeholder="Describe your specific situation, target company, role level, or any other context that would help create relevant questions..."
              value={interviewContext}
              onChange={(e) => setInterviewContext(e.target.value)}
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Examples: "Google L5 position", "Startup with 50 employees", "Remote-first company", 
              "Career transition from marketing to product"
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={startInterview}
              disabled={!selectedInterviewType || processing}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Mic className="mr-2 h-5 w-5" />
              {processing ? "Starting Interview..." : "Start Interview"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}