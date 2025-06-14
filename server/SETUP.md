# Confidence Compass Setup Guide

## Quick Start (Demo Mode)

The application can run in demo mode without any API keys configured. In demo mode:
- ✅ Basic UI and navigation works
- ✅ Face tracking and eye contact detection (using fallback methods)
- ✅ Voice analysis (basic features)
- ✅ Session tracking and progress
- ❌ AI conversation practice (requires API keys)
- ❌ Advanced speech-to-text and text-to-speech

## Full Setup (All Features)

To enable all features, you'll need to set up API keys for the following services:

### 1. Create Environment File

Copy the example environment file:
```bash
cp server/env.example server/.env
```

### 2. Configure API Keys

Edit `server/.env` and add your API keys:

#### LiveKit (Real-time Communication)
- **Required for**: AI conversation practice
- **Get from**: [LiveKit Cloud](https://cloud.livekit.io/) or run locally
- **Variables**: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

#### Deepgram (Speech-to-Text & Text-to-Speech)
- **Required for**: Voice conversation with AI
- **Get from**: [Deepgram Console](https://console.deepgram.com/)
- **Variables**: `DEEPGRAM_API_KEY`

#### OpenRouter (AI Language Model)
- **Required for**: AI conversation responses
- **Get from**: [OpenRouter](https://openrouter.ai/keys)
- **Variables**: `OPENROUTER_API_KEY`

#### OpenAI (Fallback)
- **Optional**: Alternative to OpenRouter
- **Get from**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Variables**: `OPENAI_API_KEY`

### 3. Start the Application

```bash
# Install dependencies
npm install

# Start the server
npm run dev
```

## Feature Status

| Feature | Demo Mode | Full Mode |
|---------|-----------|-----------|
| Basic UI | ✅ | ✅ |
| Face Tracking | ✅ (Basic) | ✅ (Advanced) |
| Eye Contact Detection | ✅ (Basic) | ✅ (Advanced) |
| Voice Analysis | ✅ (Basic) | ✅ (Advanced) |
| Session Tracking | ✅ | ✅ |
| AI Conversation Practice | ❌ | ✅ |
| Speech-to-Text | ❌ | ✅ |
| Text-to-Speech | ❌ | ✅ |
| Real-time Feedback | ✅ (Basic) | ✅ (Advanced) |

## Troubleshooting

### Voice Agent Connection Issues
If you see errors like "Cannot connect to host api.deepgram.com", it means:
1. Deepgram API key is not configured
2. API key is invalid
3. Network connectivity issues

**Solution**: Configure a valid Deepgram API key in your `.env` file.

### LiveKit Connection Issues
If you see "LiveKit is not configured" errors:
1. LiveKit credentials are missing
2. Using placeholder values

**Solution**: Set up LiveKit credentials (either cloud or local instance).

### Python Dependencies
If voice analysis fails:
```bash
cd server
pip install -r requirements.txt
```

## Demo Mode Features

Even without API keys, you can:
- Practice speaking in front of the camera
- Get basic eye contact feedback
- Track your practice sessions
- View your progress over time
- Use the confidence assessment tools

The application will show helpful messages when features require API keys, guiding you to set them up for full functionality. 