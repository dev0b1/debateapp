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
  MessageCircle, 
  Settings, 
  AlertTriangle, 
  Mic, 
  Target,
  TrendingUp,
  Zap,
  Brain,
  Heart,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SessionFeedback } from "@/components/conversation/session-feedback";
import { LiveKitRoom } from "@/components/conversation/livekit-room";
import { SessionAnalytics } from "@/components/conversation/session-analytics";
import { DebateScoring } from "@/components/debate/debate-scoring";
import { FAMOUS_DEBATERS, FamousDebater } from "@/lib/famous-debaters";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

interface DebateSession {
  id: string;
  type: string;
  context?: string;
  currentQuestion?: string;
}

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  prompt: string;
}

export default function AIDebate() {
  const [selectedDebateTopic, setSelectedDebateTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedDebater, setSelectedDebater] = useState<FamousDebater>(FAMOUS_DEBATERS[0]);
  const [debateContext, setDebateContext] = useState('');
  const [isInDebate, setIsInDebate] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>(null);
  const processingRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch debate topics from backend API
  const { data: debateTopics, isLoading: topicsLoading } = useQuery<DebateTopic[]>({
    queryKey: ['debate-topics'],
    queryFn: async () => {
      const response = await fetch('/api/conversation/topics');
      if (!response.ok) {
        throw new Error('Failed to fetch debate topics');
      }
      return response.json();
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (sessionData: DebateSession) => {
      // Call the actual API to create a LiveKit room
      const response = await fetch('/api/conversation/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: sessionData.type,
          context: sessionData.context,
          famousDebater: selectedDebater
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.setupRequired) {
          setSetupRequired(true);
        }
        throw new Error(errorData.message || 'Failed to create room');
      }

      const roomData = await response.json();
      return {
        ...roomData,
        sessionData,
        currentQuestion: roomData.topic?.firstQuestion || "What's your position on this topic?"
      };
    },
    onSuccess: (data) => {
      setRoomData(data);
      setCurrentQuestion(data.currentQuestion);
      setIsInDebate(true);
      setProcessing(false);
      processingRef.current = null;
      toast({
        title: "Debate Started!",
        description: "Your AI debate partner is ready. Good luck!",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      setProcessing(false);
      processingRef.current = null;
      toast({
        title: "Failed to Start Debate",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startDebate = () => {
    if (!selectedDebateTopic && !customTopic) {
      toast({
        title: "Select a Topic",
        description: "Please choose a debate topic or enter a custom one.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    processingRef.current = 'starting';

    const topicToUse = selectedDebateTopic || customTopic;
    const sessionData: DebateSession = {
      id: `debate-${Date.now()}`,
      type: topicToUse,
      context: debateContext || undefined
    };

    const sessionWithDebater = {
      ...sessionData,
      famousDebater: selectedDebater
    };

    createRoomMutation.mutate(sessionWithDebater);
  };

  const endDebate = () => {
    setIsInDebate(false);
    setRoomData(null);
    setShowFeedback(true);
    setShowAnalytics(true);
  };

  const getDebateTopicInfo = (type: string) => {
    return debateTopics?.find(topic => topic.id === type);
  };

  const selectRandomTopic = () => {
    if (debateTopics && debateTopics.length > 0) {
      const randomTopic = debateTopics[Math.floor(Math.random() * debateTopics.length)];
      setSelectedDebateTopic(randomTopic.id);
      setCustomTopic('');
    }
  };

  const selectRandomDebater = () => {
    const randomDebater = FAMOUS_DEBATERS[Math.floor(Math.random() * FAMOUS_DEBATERS.length)];
    setSelectedDebater(randomDebater);
  };

  if (isInDebate && roomData) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">AI Debate Session</h1>
              <p className="text-gray-600">Debating with {selectedDebater.name}</p>
            </div>
            <Button onClick={endDebate} variant="outline">
              End Debate
            </Button>
          </div>

          <LiveKitRoom 
            roomData={roomData} 
            onEnd={endDebate}
          />

          {showAnalytics && (
            <SessionAnalytics 
              sessionData={sessionRecording}
              onClose={() => setShowAnalytics(false)}
            />
          )}

          {showFeedback && (
            <SessionFeedback 
              sessionData={sessionRecording}
              onClose={() => setShowFeedback(false)}
            />
          )}
        </div>
      </AuthenticatedLayout>
    );
  }

  if (showFeedback || showAnalytics) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Debate Results</h1>
            <Button onClick={() => {
              setShowFeedback(false);
              setShowAnalytics(false);
              setSessionRecording(null);
            }} variant="outline">
              Back to Debate
            </Button>
          </div>

          {showAnalytics && (
            <SessionAnalytics 
              sessionData={sessionRecording}
              onClose={() => setShowAnalytics(false)}
            />
          )}

          {showFeedback && (
            <SessionFeedback 
              sessionData={sessionRecording}
              onClose={() => setShowFeedback(false)}
            />
          )}
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Start AI Debate</h1>
            <p className="text-gray-600">Choose a topic and debate with an AI opponent</p>
          </div>
        </div>

        {setupRequired && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              LiveKit is not configured. Please set up your LiveKit credentials in the server .env file to use AI conversation features.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topic Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Choose Debate Topic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topicsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading topics...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select from existing topics</Label>
                    <Select value={selectedDebateTopic} onValueChange={setSelectedDebateTopic}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a debate topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {debateTopics?.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{topic.title}</span>
                              <span className="text-sm text-gray-500">{topic.description}</span>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {topic.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {topic.category}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Or enter a custom topic</Label>
                    <Input
                      placeholder="e.g., Should social media be banned for teenagers?"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>

                  <Button onClick={selectRandomTopic} variant="outline" className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Random Topic
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Debater Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Choose AI Debater
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select your debate opponent</Label>
                <Select value={selectedDebater.id} onValueChange={(value) => {
                  const debater = FAMOUS_DEBATERS.find(d => d.id === value);
                  if (debater) setSelectedDebater(debater);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a debater" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMOUS_DEBATERS.map((debater) => (
                      <SelectItem key={debater.id} value={debater.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${debater.color}`}></div>
                          <span>{debater.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {debater.style}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedDebater.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedDebater.description}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedDebater.style}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedDebater.difficulty}
                  </Badge>
                </div>
              </div>

              <Button onClick={selectRandomDebater} variant="outline" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Random Debater
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Additional Context (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Provide additional context for the debate</Label>
              <Textarea
                placeholder="e.g., Focus on economic implications, Consider recent events, Emphasize ethical aspects..."
                value={debateContext}
                onChange={(e) => setDebateContext(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button 
            onClick={startDebate} 
            size="lg" 
            disabled={processing || (!selectedDebateTopic && !customTopic)}
            className="px-8"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting Debate...
              </>
            ) : (
              <>
                <MessageCircle className="h-5 w-5 mr-2" />
                Start Debate
              </>
            )}
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 