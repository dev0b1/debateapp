# API Setup Guide for Voice Agent

## Current Status: Mock Mode ✅

Your voice agent is currently running in **mock mode**, which means:
- ✅ The voice agent will start without errors
- ✅ Basic interview functionality works
- ✅ UI and controls are fully functional
- ⚠️ AI responses are limited (mock responses)
- ⚠️ No real AI conversation

## To Enable Full AI Features

### Option 1: OpenRouter (Recommended - Free)
1. Go to https://openrouter.ai/keys
2. Sign up for a free account
3. Create an API key
4. Add to your `.env` file:
   ```env
   OPENROUTER_API_KEY=your_actual_openrouter_key_here
   ```

### Option 2: OpenAI (Paid)
1. Go to https://platform.openai.com/api-keys
2. Create an account and add billing info
3. Create an API key
4. Add to your `.env` file:
   ```env
   OPENAI_API_KEY=your_actual_openai_key_here
   ```

### Option 3: Deepgram (Required for Speech-to-Text)
1. Go to https://console.deepgram.com/
2. Sign up for a free account (200 hours/month)
3. Create an API key
4. Add to your `.env` file:
   ```env
   DEEPGRAM_API_KEY=your_actual_deepgram_key_here
   ```

### Option 4: Cartesia (Required for Text-to-Speech)
1. Go to https://cartesia.ai/
2. Sign up for a free account
3. Create an API key
4. Add to your `.env` file:
   ```env
   CARTESIA_API_KEY=your_actual_cartesia_key_here
   ```

## Testing Your Setup

### 1. Test API Keys
```bash
cd server
python test-api-keys.py
```

### 2. Test Voice Agent
```bash
cd server
python test-voice-agent.py
```

### 3. Start the Server
```bash
npm run dev
```

## Mock Mode Features

Even without API keys, you can:

### ✅ **Working Features:**
- Start interview sessions
- See the UI and controls
- Test the interface layout
- Experience the voice agent startup process
- See mock AI responses

### ⚠️ **Limited Features:**
- AI responses are generic mock messages
- No real conversation with AI
- No speech-to-text processing
- No text-to-speech output

## Error Messages

If you see these messages, it's normal in mock mode:
```
⚠️ No valid LLM API keys found. Creating mock LLM for testing...
💡 To use real AI features, please set OPENROUTER_API_KEY or OPENAI_API_KEY in your .env file
```

## Cost Estimates

- **OpenRouter**: Free tier (10,000 requests/month)
- **Deepgram**: Free tier (200 hours/month)
- **Cartesia**: Free tier available
- **OpenAI**: Pay-per-use (~$0.002 per 1K tokens)

## Next Steps

1. **Get API keys** from the services above
2. **Update your `.env` file** with real keys
3. **Test the setup** with the provided scripts
4. **Restart your server** and try the voice agent
5. **Enjoy full AI interview functionality!**

## Troubleshooting

### "No valid LLM API keys found"
- This is expected in mock mode
- Add real API keys to enable full features

### "API test failed"
- Check your API key format
- Verify the key is active
- Check your account balance/limits

### "Voice agent not starting"
- Check your `.env` file format
- Ensure all required keys are set
- Check server logs for specific errors

## Support

If you need help setting up API keys or encounter issues:
1. Check the service documentation
2. Verify your account status
3. Test with the provided scripts
4. Check server logs for detailed error messages 