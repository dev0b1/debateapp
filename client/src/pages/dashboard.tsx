import React from 'react'
import { AuthenticatedLayout } from '../components/layout/authenticated-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  MessageCircle, 
  TrendingUp, 
  Target, 
  Clock,
  Brain,
  Zap
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username || 'Debater'}!
          </h1>
          <p className="text-blue-100">
            Ready to improve your debating skills? Choose a topic and start practicing with AI.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Start New Debate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Begin a new debate session with AI on any topic of your choice.
              </p>
              <Link to="/debate">
                <Button className="w-full">
                  Start Debate
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                View Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Check your debate history and see how you've improved over time.
              </p>
              <Link to="/history">
                <Button variant="outline" className="w-full">
                  View History
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Practice Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Explore different debate topics and practice your argumentation skills.
              </p>
              <Link to="/debate">
                <Button variant="outline" className="w-full">
                  Browse Topics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Topics Debated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Arguments Made</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent debate sessions</p>
              <p className="text-sm">Start your first debate to see activity here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
