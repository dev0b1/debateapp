import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, Play, Download, Trash2, Filter, Trophy, Clock } from "lucide-react";
import { Session } from "@shared/schema";

export default function SessionHistory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/debates"],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          id: "1",
          title: "Debate with Socrates - AI Ethics",
          createdAt: new Date().toISOString(),
          overallScore: 85,
          duration: 1800
        },
        {
          id: "2", 
          title: "Debate with Einstein - Climate Action",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          overallScore: 72,
          duration: 2400
        },
        {
          id: "3",
          title: "Debate with Elon Musk - Universal Basic Income", 
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          overallScore: 78,
          duration: 1500
        },
        {
          id: "4",
          title: "Debate with Marie Curie - Science Funding",
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          overallScore: 91,
          duration: 2100
        },
        {
          id: "5",
          title: "Debate with Dr. King - Social Justice",
          createdAt: new Date(Date.now() - 345600000).toISOString(),
          overallScore: 68,
          duration: 2700
        }
      ];
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/debate-stats"] });
      toast({
        title: "Debate Deleted",
        description: "The debate has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete debate. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteSession = (sessionId: number) => {
    if (confirm("Are you sure you want to delete this debate?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getGrade = (score: number) => {
    if (score >= 0.9) return "A+";
    if (score >= 0.8) return "A";
    if (score >= 0.7) return "B+";
    if (score >= 0.6) return "B";
    if (score >= 0.5) return "C+";
    return "C";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Debate History</h2>
          <p className="text-gray-600 mt-1">Review your past debate performances</p>
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Debates
            <Badge variant="secondary">{sessions?.length || 0} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No debates yet</h3>
              <p className="text-gray-600 mb-6">Start your first debate to begin tracking your performance</p>
              <Button>Start New Debate</Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <div key={session.id} className="py-6 hover:bg-gray-50 transition-colors rounded-lg px-4 -mx-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{session.title}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(session.createdAt).toLocaleDateString()} • {Math.floor(session.duration / 60)}m {session.duration % 60}s
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge className={getScoreColor(session.overallScore)}>
                            <Trophy className="h-3 w-3 mr-1" />
                            Score: {Math.round(session.overallScore * 100)}%
                          </Badge>
                          <Badge className={getScoreColor(session.overallScore)}>
                            <Clock className="h-3 w-3 mr-1" />
                            Duration: {Math.floor(session.duration / 60)}m
                          </Badge>
                          <Badge className={getScoreColor(session.overallScore)}>
                            Overall: {getGrade(session.overallScore)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600"
                        title="Replay debate"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-600"
                        title="Download debate"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deleteSessionMutation.isPending}
                        title="Delete debate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
