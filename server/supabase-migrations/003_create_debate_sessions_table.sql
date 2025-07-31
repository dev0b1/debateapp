-- Create debate sessions table
CREATE TABLE IF NOT EXISTS debate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  session_data JSONB,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own sessions
CREATE POLICY "Users can view own sessions" ON debate_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own sessions
CREATE POLICY "Users can insert own sessions" ON debate_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own sessions
CREATE POLICY "Users can update own sessions" ON debate_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX idx_debate_sessions_topic_id ON debate_sessions(topic_id);
CREATE INDEX idx_debate_sessions_status ON debate_sessions(status); 