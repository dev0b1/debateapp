-- Create session analytics table
CREATE TABLE IF NOT EXISTS session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES debate_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  critical_thinking_score INTEGER CHECK (critical_thinking_score >= 0 AND critical_thinking_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  argument_structure_score INTEGER CHECK (argument_structure_score >= 0 AND argument_structure_score <= 100),
  rebuttal_skills_score INTEGER CHECK (rebuttal_skills_score >= 0 AND rebuttal_skills_score <= 100),
  total_questions INTEGER DEFAULT 0,
  arguments_made INTEGER DEFAULT 0,
  rebuttals_given INTEGER DEFAULT 0,
  avg_response_time_seconds DECIMAL(5,2),
  insights JSONB,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own analytics
CREATE POLICY "Users can view own analytics" ON session_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own analytics
CREATE POLICY "Users can insert own analytics" ON session_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own analytics
CREATE POLICY "Users can update own analytics" ON session_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX idx_session_analytics_user_id ON session_analytics(user_id); 