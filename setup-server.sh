#!/bin/bash

# Confidence Compass Server Setup Script
echo "🚀 Setting up Confidence Compass Server..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
    echo "❌ Python 3.11 or higher is required. Current version: $PYTHON_VERSION"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION is installed"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) is installed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

echo "✅ Node.js dependencies installed"

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo "✅ Python dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOF
# LiveKit Configuration (Required for real-time communication)
LIVEKIT_URL=wss://your-livekit-instance.com
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Deepgram Configuration (Required for speech-to-text and TTS)
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenRouter Configuration (Required for AI conversation)
OPENROUTER_API_KEY=your_openrouter_api_key

# Frontend Environment Variables
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key

# Development Configuration
NODE_ENV=development
PORT=5000
EOF
    echo "📝 Created .env template. Please update with your API keys."
else
    echo "✅ .env file found"
fi

# Check if port 5000 is available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5000 is already in use. You may need to stop the existing process."
else
    echo "✅ Port 5000 is available"
fi

echo ""
echo "🎉 Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with your API keys"
echo "2. Get API keys from:"
echo "   - LiveKit: https://cloud.livekit.io/"
echo "   - Deepgram: https://deepgram.com/"
echo "   - OpenRouter: https://openrouter.ai/"
echo "3. Start the server with: npm run dev"
echo ""
echo "📚 For more information, see SERVER_SETUP.md" 