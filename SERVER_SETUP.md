# Confidence Compass - Server Setup Guide

This guide provides complete instructions for setting up the server-side components of Confidence Compass.

## 🚀 Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **Python 3.11+**
- **npm** or **yarn**
- **Git**

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Network**: Stable internet connection for API calls

## 📦 Installation

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd confidencecompass1-main

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Alternative: Use pip with pyproject.toml
pip install -e .
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
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
```

## 🔑 API Keys Setup

### LiveKit (Required)
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy the WebSocket URL, API Key, and API Secret
4. Add to your `.env` file

### Deepgram (Required)
1. Go to [Deepgram](https://deepgram.com/)
2. Sign up and create a new project
3. Copy your API key
4. Add to your `.env` file

### OpenRouter (Required)
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up and get your API key
3. Add to your `.env` file

## 🏗️ Server Architecture

### Node.js Backend (Express)
- **Entry Point**: `server/index.ts`
- **Port**: 5000 (default)
- **Features**:
  - REST API endpoints
  - LiveKit service integration
  - In-memory data storage
  - Vite development server integration

### Python Voice Agent
- **Entry Point**: `server/livekit-voice-agent.py`
- **Features**:
  - Real-time speech processing
  - AI conversation management
  - Voice activity detection
  - Conversation metrics tracking

## 📋 Dependencies

### Node.js Dependencies
```json
{
  "express": "^4.21.2",
  "livekit-server-sdk": "^2.13.0",
  "dotenv": "^16.5.0",
  "nanoid": "^3.3.11",
  "zod": "^3.24.2",
  "drizzle-orm": "^0.39.1",
  "drizzle-zod": "^0.7.0"
}
```

### Python Dependencies
```
deepgram-sdk>=4.1.1
livekit-agents>=1.0.23
livekit-plugins-deepgram>=1.0.23
livekit-plugins-silero>=1.0.23
livekit-plugins-openai>=1.0.23
openai>=1.84.0
python-dotenv>=1.1.0
httpx>=0.28.1
numpy>=1.24.0
torch>=2.0.0
torchaudio>=2.0.0
```

## 🚀 Running the Server

### Development Mode
```bash
# Start the development server
npm run dev

# Alternative: use the start script
npm run start-dev
```

### Production Mode
```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 🔧 Server Components

### 1. Express Server (`server/index.ts`)
- **Purpose**: Main HTTP server
- **Features**:
  - API route handling
  - Static file serving
  - Vite integration (development)
  - Error handling middleware

### 2. API Routes (`server/routes.ts`)
- **Endpoints**:
  - `/api/sessions` - Session management
  - `/api/conversation/create-room` - LiveKit room creation
  - `/api/topics` - Conversation topics
  - `/api/test/*` - Test endpoints

### 3. LiveKit Service (`server/livekit-service.ts`)
- **Purpose**: LiveKit integration
- **Features**:
  - Room creation and management
  - Voice agent process management
  - Token generation
  - Health monitoring

### 4. Voice Agent (`server/livekit-voice-agent.py`)
- **Purpose**: AI conversation partner
- **Features**:
  - Speech-to-text processing
  - AI response generation
  - Text-to-speech synthesis
  - Conversation tracking

### 5. Storage (`server/storage.ts`)
- **Purpose**: In-memory data storage
- **Features**:
  - Session data management
  - User progress tracking
  - Temporary data persistence

## 🧪 Testing the Server

### 1. Health Check
```bash
curl http://localhost:5000/api/test/health
```

### 2. API Endpoints
```bash
# Get conversation topics
curl http://localhost:5000/api/topics

# Create a session
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"topicId": "1", "duration": 300}'
```

### 3. LiveKit Integration
```bash
# Create a conversation room
curl -X POST http://localhost:5000/api/conversation/create-room \
  -H "Content-Type: application/json" \
  -d '{"topicId": "1"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 5000 already in use**
   ```bash
   # Kill the process using port 5000
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

2. **Python dependencies not found**
   ```bash
   # Reinstall Python dependencies
   pip install -r requirements.txt --force-reinstall
   ```

3. **LiveKit agent not starting**
   ```bash
   # Check Python version
   python --version  # Should be 3.11+
   
   # Check environment variables
   echo $LIVEKIT_URL
   echo $LIVEKIT_API_KEY
   ```

4. **Deepgram API errors**
   - Verify API key is correct
   - Check API quota limits
   - Ensure proper environment variable setup

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check server logs
tail -f server.log
```

## 📊 Monitoring

### Health Checks
- **Server Health**: `GET /api/test/health`
- **LiveKit Status**: `GET /api/test/livekit-status`
- **Agent Status**: `GET /api/test/agent-status`

### Logs
- **Server Logs**: Console output
- **Agent Logs**: Process stdout/stderr
- **Error Logs**: Error events and exceptions

## 🔒 Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **CORS**: Configure CORS for production deployment
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: All inputs are validated using Zod schemas
5. **Error Handling**: Comprehensive error handling prevents information leakage

## 🚀 Production Deployment

### Environment Setup
```bash
# Set production environment
export NODE_ENV=production

# Use production API keys
# Ensure all environment variables are set
```

### Process Management
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name "confidence-compass"

# Monitor processes
pm2 status
pm2 logs confidence-compass
```

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 📈 Performance Optimization

1. **Memory Management**: Monitor memory usage for long-running sessions
2. **Connection Pooling**: Optimize database connections (when using database)
3. **Caching**: Implement caching for frequently accessed data
4. **Load Balancing**: Use load balancer for multiple server instances

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
# Update Node.js dependencies
npm update

# Update Python dependencies
pip install -r requirements.txt --upgrade
```

### Backup and Recovery
- **Data Backup**: Export in-memory data periodically
- **Configuration Backup**: Backup `.env` and configuration files
- **Log Rotation**: Implement log rotation for production

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify environment configuration
4. Test individual components
5. Check API documentation for external services 