# API Setup Guide for Voice Agent

The voice agent requires several API keys to function properly. Follow this guide to set up all required services.

## Required API Keys

### 1. LLM Provider (Choose one)

#### Option A: OpenRouter (Recommended)
- **URL**: https://openrouter.ai/keys
- **Cost**: Free tier available
- **Models**: Access to multiple models including Mistral, GPT, Claude, etc.
- **Environment Variable**: `OPENROUTER_API_KEY`

#### Option B: OpenAI
- **URL**: https://platform.openai.com/api-keys
- **Cost**: Pay-per-use
- **Models**: GPT-3.5-turbo, GPT-4
- **Environment Variable**: `OPENAI_API_KEY`

### 2. Speech-to-Text: Deepgram
- **URL**: https://console.deepgram.com/
- **Cost**: Free tier available (200 hours/month)
- **Environment Variable**: `DEEPGRAM_API_KEY`

### 3. Text-to-Speech: Cartesia
- **URL**: https://cartesia.ai/
- **Cost**: Free tier available
- **Environment Variable**: `CARTESIA_API_KEY`

## Setup Instructions

### Step 1: Create .env file
Create a `.env` file in the `server` directory with the following content:

```env
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Deepgram Configuration (for speech-to-text)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# OpenRouter Configuration (for LLM - recommended)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenAI Configuration (fallback LLM)
OPENAI_API_KEY=your_openai_api_key_here

# Cartesia Configuration (for text-to-speech)
CARTESIA_API_KEY=your_cartesia_api_key_here

# Database Configuration (optional)
DATABASE_URL=postgresql://localhost:5432/confidence_compass

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Step 2: Get API Keys

1. **OpenRouter** (Recommended for LLM):
   - Go to https://openrouter.ai/keys
   - Sign up for a free account
   - Create an API key
   - Replace `your_openrouter_api_key_here` with your actual key

2. **Deepgram** (Speech-to-Text):
   - Go to https://console.deepgram.com/
   - Sign up for a free account
   - Create an API key
   - Replace `your_deepgram_api_key_here` with your actual key

3. **Cartesia** (Text-to-Speech):
   - Go to https://cartesia.ai/
   - Sign up for a free account
   - Create an API key
   - Replace `your_cartesia_api_key_here` with your actual key

4. **OpenAI** (Optional fallback):
   - Go to https://platform.openai.com/api-keys
   - Create an account and add billing info
   - Create an API key
   - Replace `your_openai_api_key_here` with your actual key

### Step 3: Test Your Setup

Run the test script to verify all API keys are working:

```bash
cd server
python test-api-keys.py
```

This will test all your API keys and provide detailed feedback on what's working and what needs to be fixed.

## Troubleshooting

### 502 Bad Gateway Errors
If you're getting 502 errors from the LLM provider:

1. **Check your API key**: Make sure it's correctly set in the `.env` file
2. **Check your quota**: Some providers have rate limits or usage limits
3. **Try a different model**: The current model might be experiencing issues
4. **Use fallback**: The updated voice agent will automatically try OpenAI if OpenRouter fails

### Common Issues

1. **"No valid LLM API keys found"**
   - Make sure you have at least one LLM provider configured (OpenRouter or OpenAI)
   - Check that your `.env` file is in the correct location (`server/.env`)

2. **"Deepgram API test failed"**
   - Verify your Deepgram API key is correct
   - Check that you haven't exceeded your free tier limits

3. **"Cartesia API test failed"**
   - Verify your Cartesia API key is correct
   - Check that you haven't exceeded your free tier limits

## Cost Estimates

- **OpenRouter**: Free tier includes 10,000 requests/month
- **Deepgram**: Free tier includes 200 hours/month of audio processing
- **Cartesia**: Free tier available
- **OpenAI**: Pay-per-use (approximately $0.002 per 1K tokens for GPT-3.5-turbo)

## Next Steps

After setting up your API keys:

1. Test them with the provided script
2. Restart your server
3. Try creating a new conversation room
4. The voice agent should now work without 502 errors

If you continue to have issues, check the server logs for more detailed error messages. 