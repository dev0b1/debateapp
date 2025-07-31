# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

## 2. Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:3001
```

## 3. Database Setup

Run the following SQL migrations in your Supabase SQL editor:

### Migration 1: Users Table
```sql
-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Migration 2: Debate Topics Table
```sql
-- Create debate topics table
CREATE TABLE IF NOT EXISTS debate_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE debate_topics ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to active topics
CREATE POLICY "Public can view active topics" ON debate_topics
  FOR SELECT USING (is_active = true);

-- Insert default debate topics
INSERT INTO debate_topics (topic_id, title, description, difficulty, category, prompt) VALUES
('ai-regulation', 'AI Regulation & Ethics', 'Should AI development be heavily regulated?', 'advanced', 'Technology', 'You are engaging in a debate about AI regulation and ethics...'),
('universal-basic-income', 'Universal Basic Income', 'Should every citizen receive a guaranteed basic income?', 'intermediate', 'Economics', 'You are debating Universal Basic Income (UBI)...'),
('social-media-regulation', 'Social Media Regulation', 'Should social media platforms be more heavily regulated?', 'intermediate', 'Technology', 'You are debating social media regulation...'),
('climate-action', 'Climate Action vs. Economic Growth', 'Should we prioritize climate action over economic growth?', 'intermediate', 'Environment', 'You are debating the trade-off between climate action and economic growth...'),
('remote-work', 'Remote Work vs. Office Work', 'Is remote work better than traditional office work?', 'beginner', 'Business', 'You are debating the future of work - remote vs. office...'),
('education-reform', 'Education System Reform', 'Should we completely reform our education system?', 'intermediate', 'Education', 'You are debating education system reform...'),
('healthcare-system', 'Healthcare System Reform', 'Should we move to a single-payer healthcare system?', 'advanced', 'Healthcare', 'You are debating healthcare system reform...'),
('immigration-policy', 'Immigration Policy', 'Should we have more open or restrictive immigration policies?', 'advanced', 'Politics', 'You are debating immigration policy...');
```

### Migration 3: Debate Sessions Table
```sql
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
```

### Migration 4: Session Analytics Table
```sql
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
```

## 4. Authentication Setup

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs for your app

## 5. Install Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Install React Router for navigation
npm install react-router-dom
```

## 6. Test the Setup

1. Start your development server
2. Navigate to `/auth` to test sign up/sign in
3. Check that users are created in the Supabase dashboard

## Features Included

✅ **User Authentication**
- Sign up with email/password
- Sign in/out functionality
- User profiles with username and full name

✅ **Debate Topics**
- 8 pre-configured debate topics
- Different difficulty levels
- Detailed prompts for AI

✅ **Session Management**
- Track debate sessions
- Store session data and analytics
- User-specific session history

✅ **Analytics**
- Performance scoring
- Detailed metrics tracking
- Insights and recommendations

## Next Steps

1. **Multiplayer Mode**: Add real-time debate rooms with multiple users
2. **Advanced Analytics**: Add charts and progress tracking
3. **Topic Management**: Allow users to create custom topics
4. **Leaderboards**: Add competitive features
5. **Mobile App**: Create React Native version

## Multiplayer Mode Preview

The multiplayer mode will feel like:
- **Real-time Debate Rooms**: Multiple users can join the same debate topic
- **Live Audience**: Spectators can watch debates and vote
- **Moderator AI**: AI can moderate debates between multiple humans
- **Team Debates**: Support for team-based debates
- **Tournament Mode**: Bracket-style debate competitions
- **Live Chat**: Real-time discussion during debates 