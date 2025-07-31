import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Play, Zap, Trophy, TrendingUp, Clock, Target } from "lucide-react";

interface Session {
  id: string;
  title: string;
  createdAt: string;
  overallScore: number;
  duration: number;
}

interface DebateStats {
  totalDebates: number;
  averageScore: number;
  winRate: number;
  streakDays: number;
  totalSpeakingTime: number;
  argumentsMade: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: debateStats, isLoading } = useQuery<DebateStats>({
    queryKey: ["/api/user/debate-stats"],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        totalDebates: 24,
        averageScore: 82,
        winRate: 68,
        streakDays: 7,
        totalSpeakingTime: 7200, // in seconds
        argumentsMade: 156
      };
    }
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
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
        }
      ];
    }
  });

  const recentSessions = sessions?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
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
          <h2 className="text-2xl font-bold text-gray-900">Debate Arena Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your debate performance and improvement</p>
        </div>
        <Button 
          onClick={() => setLocation("/ai-debate")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Debate
        </Button>
      </div>

             {/* Debate Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card>
           <CardContent className="p-6">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                 <Zap className="h-5 w-5 text-purple-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Total Debates</p>
                 <p className="text-2xl font-bold text-gray-900">{debateStats?.totalDebates || 0}</p>
               </div>
             </div>
           </CardContent>
         </Card>

         <Card>
           <CardContent className="p-6">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                 <Trophy className="h-5 w-5 text-green-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Win Rate</p>
                 <p className="text-2xl font-bold text-gray-900">{debateStats?.winRate || 0}%</p>
               </div>
             </div>
           </CardContent>
         </Card>

         <Card>
           <CardContent className="p-6">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                 <TrendingUp className="h-5 w-5 text-blue-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Avg Score</p>
                 <p className="text-2xl font-bold text-gray-900">{debateStats?.averageScore || 0}</p>
               </div>
             </div>
           </CardContent>
         </Card>

         <Card>
           <CardContent className="p-6">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                 <Clock className="h-5 w-5 text-orange-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Streak</p>
                 <p className="text-2xl font-bold text-gray-900">{debateStats?.streakDays || 0} days</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Debate Performance Chart */}
         <div className="lg:col-span-2">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Debate Performance</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                 <div className="text-center">
                   <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                   <p className="text-gray-600">Performance chart coming soon</p>
                   <p className="text-sm text-gray-500">Track your debate improvement over time</p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>

         {/* Recent Debates */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Recent Debates</CardTitle>
           </CardHeader>
          <CardContent className="space-y-4">
                         {recentSessions.length === 0 ? (
               <div className="text-center py-8">
                 <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                 <p className="text-gray-600">No debates yet</p>
                 <p className="text-sm text-gray-500 mt-1">Start your first debate to see your performance</p>
               </div>
             ) : (
              recentSessions.map((session: any) => (
                                 <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                   <div className="flex items-center space-x-3">
                     <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                       <Zap className="h-5 w-5 text-purple-600" />
                     </div>
                     <div>
                       <p className="font-medium text-gray-900">{session.title}</p>
                       <p className="text-sm text-gray-500">
                         {new Date(session.createdAt).toLocaleDateString()}
                       </p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-medium text-gray-900">
                       {Math.round(session.overallScore)}%
                     </p>
                     <p className="text-xs text-gray-500">
                       {Math.floor(session.duration / 60)}m {session.duration % 60}s
                     </p>
                   </div>
                 </div>
              ))
            )}
            
                         {recentSessions.length > 0 && (
               <Button 
                 className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                 onClick={() => setLocation("/history")}
               >
                 <History className="mr-2 h-4 w-4" />
                 View All Debates
               </Button>
             )}
          </CardContent>
        </Card>
      </div>

             {/* Quick Actions */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Quick Actions</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Button
               className="flex items-center space-x-3 p-4 h-auto justify-start hover:border-purple-300 hover:bg-purple-50 border border-gray-200 bg-white"
               onClick={() => setLocation("/ai-debate")}
             >
               <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                 <Zap className="h-5 w-5 text-purple-600" />
               </div>
               <div className="text-left">
                 <p className="font-medium text-gray-900">Start New Debate</p>
                 <p className="text-sm text-gray-500">Debate with famous personalities</p>
               </div>
             </Button>

             <Button
               className="flex items-center space-x-3 p-4 h-auto justify-start hover:border-green-300 hover:bg-green-50 border border-gray-200 bg-white"
               onClick={() => setLocation("/ai-debate")}
             >
               <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                 <Trophy className="h-5 w-5 text-green-600" />
               </div>
               <div className="text-left">
                 <p className="font-medium text-gray-900">Random Challenge</p>
                 <p className="text-sm text-gray-500">Surprise topic and opponent</p>
               </div>
             </Button>

             <Button
               className="flex items-center space-x-3 p-4 h-auto justify-start hover:border-blue-300 hover:bg-blue-50 border border-gray-200 bg-white"
               onClick={() => setLocation("/history")}
             >
               <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                 <History className="h-5 w-5 text-blue-600" />
               </div>
               <div className="text-left">
                 <p className="font-medium text-gray-900">Debate History</p>
                 <p className="text-sm text-gray-500">Review past performances</p>
               </div>
             </Button>
           </div>
         </CardContent>
       </Card>
    </div>
  );
}
