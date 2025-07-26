import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Users, 
  MessageCircle, 
  Settings, 
  AlertTriangle, 
  Mic, 
  Plus,
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

interface ConversationTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'quick' | 'role' | 'custom';
  context?: string;
}

// Pre-defined quick start topics
const quickStartTopics: ConversationTopic[] = [
  {
    id: 'general-interview',
    title: 'General Interview',
    description: 'Common interview questions for any role',
    category: 'General',
    difficulty: 'beginner',
    type: 'quick'
  },
  {
    id: 'behavioral-questions',
    title: 'Behavioral Questions',
    description: 'STAR method and situational questions',
    category: 'Behavioral',
    difficulty: 'intermediate',
    type: 'quick'
  },
  {
    id: 'leadership-role',
    title: 'Leadership Role',
    description: 'Management and leadership scenarios',
    category: 'Leadership',
    difficulty: 'advanced',
    type: 'quick'
  },
  {
    id: 'teamwork-scenarios',
    title: 'Teamwork Scenarios',
    description: 'Collaboration and conflict resolution',
    category: 'Teamwork',
    difficulty: 'intermediate',
    type: 'quick'
  },
  {
    id: 'problem-solving',
    title: 'Problem Solving',
    description: 'Analytical and critical thinking questions',
    category: 'Problem Solving',
    difficulty: 'advanced',
    type: 'quick'
  },
  {
    id: 'culture-fit',
    title: 'Culture Fit',
    description: 'Values, motivation, and company alignment',
    category: 'Culture',
    difficulty: 'beginner',
    type: 'quick'
  }
];

// Role-based topics
const roleBasedTopics: ConversationTopic[] = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    description: 'Technical and behavioral questions for software roles',
    category: 'Technology',
    difficulty: 'intermediate',
    type: 'role',
    context: 'Software engineering position with focus on coding, system design, and technical problem solving'
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    description: 'Product strategy, user research, and cross-functional leadership',
    category: 'Product',
    difficulty: 'advanced',
    type: 'role',
    context: 'Product management role focusing on strategy, user experience, and stakeholder management'
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Analytics, machine learning, and data-driven decision making',
    category: 'Data',
    difficulty: 'advanced',
    type: 'role',
    context: 'Data science position with emphasis on statistical analysis, ML models, and business impact'
  },
  {
    id: 'marketing-manager',
    title: 'Marketing Manager',
    description: 'Campaign strategy, brand management, and ROI analysis',
    category: 'Marketing',
    difficulty: 'intermediate',
    type: 'role',
    context: 'Marketing leadership role focusing on strategy, campaigns, and measurable results'
  },
  {
    id: 'sales-representative',
    title: 'Sales Representative',
    description: 'Client relationships, objection handling, and quota achievement',
    category: 'Sales',
    difficulty: 'intermediate',
    type: 'role',
    context: 'Sales position with focus on relationship building, pipeline management, and revenue generation'
  },
  {
    id: 'hr-specialist',
    title: 'HR Specialist',
    description: 'Employee relations, recruitment, and organizational development',
    category: 'Human Resources',
    difficulty: 'intermediate',
    type: 'role',
    context: 'HR role focusing on talent acquisition, employee engagement, and workplace culture'
  }
];

export default function AIConversation() {
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [isInConversation, setIsInConversation] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [processingTopicId, setProcessingTopicId] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<any>(null);
  const [customContext, setCustomContext] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const processingRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Mock API calls - replace with real endpoints
  const { data: conversationTopics = [...quickStartTopics, ...roleBasedTopics], isLoading } = useQuery({
    queryKey: ['conversation-topics'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return [...quickStartTopics, ...roleBasedTopics];
    }
  });

  const createRoomMutation = useMutation({
    mutationFn: async (topicId: string) => {
      // Simulate room creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { roomId: `room-${topicId}-${Date.now()}`, topicId };
    },
    onSuccess: (data) => {
      setRoomData(data);
      setIsInConversation(true);
      setProcessingTopicId(null);
      processingRef.current = null;
      toast({
        title: "Conversation Started!",
        description: "Your AI interview partner is ready. Good luck!",
      });
    },
    onError: (error) => {
      setProcessingTopicId(null);
      processingRef.current = null;
      toast({
        title: "Failed to start conversation",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  });

  const startConversation = (topic: ConversationTopic) => {
    console.log("Starting conversation for topic:", topic.id, topic.title);
    setSelectedTopic(topic);
    setProcessingTopicId(topic.id);
    processingRef.current = topic.id;
    createRoomMutation.mutate(topic.id);
  };

  const handleStartChat = (e: React.MouseEvent, topic: ConversationTopic) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Button clicked for topic:", topic.id, "Current processingTopicId:", processingTopicId, "Ref:", processingRef.current);
    
    if (processingTopicId || processingRef.current) {
      console.log("Conversation already starting, ignoring click");
      return;
    }
    
    console.log("Start chat clicked for topic:", topic.id);
    startConversation(topic);
  };

  const handleCustomConversation = () => {
    const customTopic: ConversationTopic = {
      id: `custom-${Date.now()}`,
      title: `Custom: ${selectedRole || 'Interview'}`,
      description: customContext || 'Custom interview scenario',
      category: selectedIndustry || 'Custom',
      difficulty: 'intermediate',
      type: 'custom',
      context: `Role: ${selectedRole}, Industry: ${selectedIndustry}, Company: ${selectedCompany}, Context: ${customContext}`
    };
    startConversation(customTopic);
  };

  const endConversation = () => {
    setIsInConversation(false);
    setRoomData(null);
    setSelectedTopic(null);
    setProcessingTopicId(null);
    processingRef.current = null;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Technology': return Brain;
      case 'Product': return Target;
      case 'Data': return Sparkles;
      case 'Marketing': return MessageCircle;
      case 'Sales': return Users;
      case 'Human Resources': return User;
      case 'General': return Briefcase;
      default: return Brain;
    }
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

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Conversation</h2>
            <p className="text-gray-600 mt-1">{selectedTopic?.title}</p>
            {selectedTopic?.context && (
              <p className="text-sm text-gray-500 mt-1">{selectedTopic.context}</p>
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
            End Conversation
          </Button>
        </div>

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

          {/* AI Conversation */}
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
                  Session Feedback & Analysis
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Conversation Practice</h2>
        <p className="text-gray-600 mt-1">Practice real conversations with AI partners on various topics</p>
      </div>

      {/* Setup Required Banner */}
      {setupRequired && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Setup Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="space-y-2">
              <p>AI conversation features require API keys to be configured. You can still use other features like face tracking and voice analysis in demo mode.</p>
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

      {/* Topic Selection Tabs */}
      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Start
          </TabsTrigger>
          <TabsTrigger value="role" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Role-Based
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Custom Context
          </TabsTrigger>
        </TabsList>

        {/* Quick Start Topics */}
        <TabsContent value="quick" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Start Topics</h3>
            <p className="text-gray-600 mb-6">Choose from pre-defined interview scenarios to get started quickly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickStartTopics.map((topic: ConversationTopic) => {
              const CategoryIcon = getCategoryIcon(topic.category);
              
              return (
                <Card key={topic.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100`}>
                        <CategoryIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <Badge className={getDifficultyColor(topic.difficulty)}>
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm">{topic.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{topic.category}</Badge>
                      <Button 
                        onClick={(e) => handleStartChat(e, topic)}
                        disabled={processingTopicId === topic.id || processingRef.current === topic.id}
                        className={`${
                          (processingTopicId === topic.id || processingRef.current === topic.id)
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700"
                        } transition-colors duration-200`}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        {(processingTopicId === topic.id || processingRef.current === topic.id) ? "Starting..." : "Start Chat"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Role-Based Topics */}
        <TabsContent value="role" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Role-Based Practice</h3>
            <p className="text-gray-600 mb-6">Practice with industry-specific questions tailored to your target role.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleBasedTopics.map((topic: ConversationTopic) => {
              const CategoryIcon = getCategoryIcon(topic.category);
              
              return (
                <Card key={topic.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-green-100`}>
                        <CategoryIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <Badge className={getDifficultyColor(topic.difficulty)}>
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm">{topic.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{topic.category}</Badge>
                      <Button 
                        onClick={(e) => handleStartChat(e, topic)}
                        disabled={processingTopicId === topic.id || processingRef.current === topic.id}
                        className={`${
                          (processingTopicId === topic.id || processingRef.current === topic.id)
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-green-600 hover:bg-green-700"
                        } transition-colors duration-200`}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        {(processingTopicId === topic.id || processingRef.current === topic.id) ? "Starting..." : "Start Chat"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Custom Context */}
        <TabsContent value="custom" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Custom Interview Context</h3>
            <p className="text-gray-600 mb-6">Create a personalized interview scenario based on your specific situation.</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Custom Interview Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Target Role</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Senior Software Engineer"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Target Company (Optional)</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google, Amazon"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="context">Interview Context</Label>
                <Textarea
                  id="context"
                  placeholder="Describe your specific situation, the type of interview, key challenges you want to practice, or any other context that would help create relevant questions..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Examples: "Behavioral interview for a startup", "Technical interview with system design focus", 
                  "Leadership role in a remote team", "Career transition from marketing to product"
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleCustomConversation}
                  disabled={!selectedRole || !customContext || processingTopicId !== null}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {processingTopicId ? "Starting..." : "Start Custom Interview"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}