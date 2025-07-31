import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  username?: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface DebateTopic {
  id: string
  topic_id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  prompt: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DebateSession {
  id: string
  user_id: string
  topic_id: string
  room_name: string
  session_data?: any
  status: 'active' | 'completed' | 'cancelled'
  started_at: string
  ended_at?: string
  duration_seconds?: number
  created_at: string
  updated_at: string
}

export interface SessionAnalytics {
  id: string
  session_id: string
  user_id: string
  overall_score?: number
  critical_thinking_score?: number
  communication_score?: number
  argument_structure_score?: number
  rebuttal_skills_score?: number
  total_questions: number
  arguments_made: number
  rebuttals_given: number
  avg_response_time_seconds?: number
  insights?: any
  recommendations?: any
  created_at: string
  updated_at: string
} 