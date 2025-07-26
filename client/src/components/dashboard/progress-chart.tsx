import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Session } from "@shared/schema";

interface ChartDataPoint {
  day: string;
  eyeContact: number;
  voiceClarity: number;
  overall: number;
}

export function ProgressChart() {
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return [
        {
          id: "1",
          title: "Behavioral Interview Practice",
          createdAt: new Date().toISOString(),
          overallScore: 85,
          duration: 1800,
          eyeContactScore: 0.82,
          voiceClarity: 0.78
        },
        {
          id: "2", 
          title: "Technical Interview Practice",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          overallScore: 72,
          duration: 2400,
          eyeContactScore: 0.75,
          voiceClarity: 0.68
        },
        {
          id: "3",
          title: "General Interview Practice", 
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          overallScore: 78,
          duration: 1500,
          eyeContactScore: 0.79,
          voiceClarity: 0.76
        }
      ];
    }
  });

  // Process sessions data for chart
  const chartData: ChartDataPoint[] = sessions?.slice(0, 7).reverse().map((session, index) => ({
    day: `Day ${index + 1}`,
    eyeContact: Math.round(session.eyeContactScore * 100),
    voiceClarity: Math.round(session.voiceClarity * 100),
    overall: Math.round(session.overallScore * 100)
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Progress Over Time</CardTitle>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Last Year</option>
        </select>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No data available yet</p>
              <p className="text-sm text-gray-500 mt-1">Complete more sessions to see your progress</p>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-end justify-between space-x-2 p-4">
            {chartData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full bg-gray-100 rounded-lg relative h-32 flex flex-col justify-end">
                  <div 
                    className="bg-blue-500 rounded-t-lg"
                    style={{ height: `${(data.eyeContact / 100) * 100}%` }}
                    title={`Eye Contact: ${data.eyeContact}%`}
                  />
                  <div 
                    className="bg-green-500"
                    style={{ height: `${(data.voiceClarity / 100) * 30}%` }}
                    title={`Voice Clarity: ${data.voiceClarity}%`}
                  />
                  <div 
                    className="bg-yellow-500 rounded-b-lg"
                    style={{ height: `${(data.overall / 100) * 20}%` }}
                    title={`Overall: ${data.overall}%`}
                  />
                </div>
                <span className="text-xs text-gray-600">{data.day}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Eye Contact</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Voice Clarity</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span>Overall Score</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
