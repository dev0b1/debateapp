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

interface DebateSession {
  id: string;
  type: string;
  context?: string;
  currentQuestion?: string;
}

// Debate topics
const debateTopics = [
  { value: 'ai-regulation', label: 'AI Regulation & Ethics', description: 'Should AI development be heavily regulated?', category: 'Technology' },
  { value: 'universal-basic-income', label: 'Universal Basic Income', description: 'Should every citizen receive a guaranteed basic income?', category: 'Economics' },
  { value: 'social-media-regulation', label: 'Social Media Regulation', description: 'Should social media platforms be more heavily regulated?', category: 'Technology' },
  { value: 'climate-action', label: 'Climate Action vs. Economic Growth', description: 'Should we prioritize climate action over economic growth?', category: 'Environment' },
  { value: 'remote-work', label: 'Remote Work vs. Office Work', description: 'Is remote work better than traditional office work?', category: 'Business' },
  { value: 'education-reform', label: 'Education System Reform', description: 'Should we completely reform our education system?', category: 'Education' },
  { value: 'healthcare-system', label: 'Healthcare System Reform', description: 'Should we move to a single-payer healthcare system?', category: 'Healthcare' },
  { value: 'immigration-policy', label: 'Immigration Policy', description: 'Should we have more open or restrictive immigration policies?', category: 'Politics' }
];

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
          context: sessionData.context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
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
      });
    },
    onError: (error) => {
      setProcessing(false);
      processingRef.current = null;
      toast({
        title: "Failed to start debate",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  });

  const startDebate = () => {
    const topicToUse = customTopic || selectedDebateTopic;
    
    if (!topicToUse) {
      toast({
        title: "Select or Enter Debate Topic",
        description: "Please choose a debate topic or enter a custom topic to continue.",
        variant: "destructive",
      });
      return;
    }

    const sessionData: DebateSession = {
      id: `debate-${Date.now()}`,
      type: topicToUse,
      context: debateContext || undefined
    };

    // Add famous debater to the session data
    const sessionWithDebater = {
      ...sessionData,
      famousDebater: selectedDebater
    };

    setProcessing(true);
    processingRef.current = sessionData.id;
    createRoomMutation.mutate(sessionWithDebater);
  };

  const endDebate = () => {
    setIsInDebate(false);
    setRoomData(null);
    setSelectedDebateTopic('');
    setCustomTopic('');
    setDebateContext('');
    setCurrentQuestion('');
    setProcessing(false);
    processingRef.current = null;
  };

  const getDebateTopicInfo = (type: string) => {
    return debateTopics.find(t => t.value === type);
  };

  const selectRandomTopic = () => {
    const randomTopic = debateTopics[Math.floor(Math.random() * debateTopics.length)];
    setSelectedDebateTopic(randomTopic.value);
    setCustomTopic(''); // Clear custom topic when selecting random
  };

  const selectRandomDebater = () => {
    const randomDebater = FAMOUS_DEBATERS[Math.floor(Math.random() * FAMOUS_DEBATERS.length)];
    setSelectedDebater(randomDebater);
  };

  if (isInDebate && roomData) {
    const debateTopicInfo = getDebateTopicInfo(roomData.sessionData.type);

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Debate</h2>
            <p className="text-gray-600 mt-1">{debateTopicInfo?.label}</p>
            {roomData.sessionData.context && (
              <p className="text-sm text-gray-500 mt-1">Context: {roomData.sessionData.context}</p>
            )}
          </div>
          <Button 
            onClick={endDebate}
            variant="destructive"
          >
            End Debate
          </Button>
        </div>

        {/* Current Question Display */}
        {currentQuestion && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-purple-900 mb-1">Current Topic</h3>
                  <p className="text-purple-800">{currentQuestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debate Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveKitRoom 
              roomData={roomData}
              onEnd={endDebate}
            />
          </div>
          <div className="lg:col-span-1">
            <DebateScoring 
              sessionId={roomData.sessionData.id}
              onScoreUpdate={(metrics) => {
                console.log('Debate metrics updated:', metrics);
              }}
            />
          </div>
        </div>

        {/* Session Analytics */}
        {showAnalytics && sessionAnalytics && (
          <div className="mt-8">
            <SessionAnalytics
              questionHistory={sessionAnalytics.questionHistory}
              sessionStats={sessionAnalytics.sessionStats}
              onClose={() => setShowAnalytics(false)}
            />
          </div>
        )}

        {/* Session Feedback */}
        {showFeedback && sessionRecording && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Debate Feedback & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SessionFeedback
                  sessionData={sessionRecording}
                  onTimestampClick={(timestamp) => {
                    // Video playback functionality removed - face detection is no longer used
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
        <h2 className="text-2xl font-bold text-gray-900">AI Debate Practice</h2>
        <p className="text-gray-600 mt-1">Practice debating with AI personalities on controversial topics</p>
      </div>

      {/* Setup Required Banner */}
      {setupRequired && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Setup Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="space-y-2">
              <p>AI debate features require API keys to be configured. You can still use other features like voice analysis in demo mode.</p>
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

      {/* Debate Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Debate Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="debate-topic">Debate Topic</Label>
              <div className="space-y-2">
                <Select value={selectedDebateTopic} onValueChange={setSelectedDebateTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select debate topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {debateTopics.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        <div>
                          <div className="font-medium">{topic.label}</div>
                          <div className="text-sm text-muted-foreground">{topic.description}</div>
                          <Badge variant="secondary" className="mt-1">{topic.category}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    onClick={selectRandomTopic}
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    🎲 Random Topic
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debate-personality">Choose Your Famous Debate Partner</Label>
              <div className="grid grid-cols-1 gap-3 mt-2">
                {FAMOUS_DEBATERS.map((debater) => (
                  <div
                    key={debater.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedDebater.id === debater.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDebater(debater)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{debater.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{debater.name}</h3>
                        <p className="text-sm text-gray-600">{debater.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {debater.field}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {debater.era}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 italic">"{debater.famousQuote}"</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  onClick={selectRandomDebater}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  🎲 Random Famous Person
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-topic">Custom Topic (Optional)</Label>
              <Input
                id="custom-topic"
                placeholder="e.g., Should we colonize Mars? Is social media good for society?"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
              <p className="text-xs text-gray-500">Leave blank to use selected topic above</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="context">Your Position (Optional)</Label>
              <Input
                id="context"
                placeholder="e.g., I support AI regulation, I'm against UBI, etc."
                value={debateContext}
                onChange={(e) => setDebateContext(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="detailed-context">Additional Context (Optional)</Label>
            <Textarea
              id="detailed-context"
              placeholder="Describe your specific position, background knowledge, or any other context that would help create a more engaging debate..."
              value={debateContext}
              onChange={(e) => setDebateContext(e.target.value)}
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Examples: "I work in tech and see both sides", "I'm a student studying economics", 
              "I have strong views on this topic", "I'm open to being convinced"
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={startDebate}
              disabled={(!selectedDebateTopic && !customTopic) || processing}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Mic className="mr-2 h-5 w-5" />
              {processing ? "Starting Debate..." : "Start Debate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 