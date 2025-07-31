import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/use-auth'
import { AuthForm } from './components/auth/auth-form'
import AIDebate from './pages/ai-debate'
import Dashboard from './pages/dashboard'
import SessionHistory from './pages/session-history'
import Settings from './pages/settings'
import NotFound from './pages/not-found'
import { Toaster } from './components/ui/toaster'

// Create a client
const queryClient = new QueryClient()

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/auth" 
            element={user ? <Navigate to="/dashboard" replace /> : <AuthForm />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/debate" 
            element={user ? <AIDebate /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/history" 
            element={user ? <SessionHistory /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/settings" 
            element={user ? <Settings /> : <Navigate to="/auth" replace />} 
          />
          
          {/* Default redirects */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <Toaster />
      </div>
    </Router>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
