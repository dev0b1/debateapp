# Confidence Compass - Setup Guide (No Database Required)

This guide will help you set up and run the Confidence Compass application without database dependencies.

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python 3.11+**
- **npm** or **yarn**

### 2. Installation

```bash
# Clone and navigate to the project
cd confidencecompass1-main

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# LiveKit Configuration (Required for real-time communication)
# Get these from https://cloud.livekit.io/ or your self-hosted LiveKit instance
LIVEKIT_URL=wss://your-livekit-instance.com
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Deepgram Configuration (Required for speech-to-text and TTS)
# Get this from https://deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI/OpenRouter Configuration (Required for AI conversation)
# Get this from https://openrouter.ai/ or use your OpenAI API key
OPENROUTER_API_KEY=your_openrouter_api_key

# Frontend Environment Variables (Required for client-side features)
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key

# Development Configuration
NODE_ENV=development
```

### 4. Get API Keys

#### LiveKit (Required)
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy the WebSocket URL, API Key, and API Secret

#### Deepgram (Required)
1. Go to [Deepgram](https://deepgram.com/)
2. Sign up and create a new project
3. Copy your API key

#### OpenRouter (Required)
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up and get your API key
3. Or use your OpenAI API key directly

### 5. Run the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 🔧 What's Working

### ✅ Core Features (No Database Required)
- **Voice Analysis**: Real-time voice metrics and analysis
- **Eye Tracking**: Face detection and eye contact tracking
- **AI Conversation**: LiveKit-powered voice conversations
- **Session Recording**: Practice session recording and metrics
- **Real-time Feedback**: Live feedback during practice sessions

### ✅ Data Storage
- **In-Memory Storage**: All data is stored in memory (no database needed)
- **Session Persistence**: Sessions persist during the application runtime
- **User Progress**: Progress tracking works without database

## 🚨 Troubleshooting

### Common Issues

1. **"LiveKit credentials not configured"**
   - Make sure you've set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`

2. **"Deepgram API key not configured"**
   - Make sure you've set `DEEPGRAM_API_KEY` and `VITE_DEEPGRAM_API_KEY`

3. **"OpenRouter API key not configured"**
   - Make sure you've set `OPENROUTER_API_KEY`

4. **Python dependencies not found**
   - Run `pip install -r requirements.txt`
   - Make sure you're using Python 3.11+

5. **Camera/Microphone permissions**
   - Allow browser access to camera and microphone
   - Make sure you're using HTTPS or localhost

### Development Tips

- The application uses in-memory storage, so data will be lost when you restart the server
- For production, you'll want to add a proper database
- All API keys are required for full functionality
- The application works best in Chrome/Edge with camera permissions

## 📁 Project Structure

```
confidencecompass1-main/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # In-memory storage
│   └── livekit-voice-agent.py  # Python voice agent
├── shared/                 # Shared types and schemas
└── package.json           # Node.js dependencies
```

## 🎯 Next Steps

Once you have the basic functionality working:

1. **Add Database**: Replace in-memory storage with PostgreSQL
2. **Add Authentication**: Implement user login/signup
3. **Add File Storage**: Store session recordings
4. **Add Analytics**: More detailed progress tracking
5. **Add Mobile Support**: Optimize for mobile devices 