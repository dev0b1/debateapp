# LiveKit Setup Guide for Confidence Compass

This guide explains how to set up LiveKit for real-time communication in Confidence Compass.

## 🎯 What is LiveKit?

LiveKit is a real-time communication platform that provides:
- **WebRTC Infrastructure**: Handles audio/video streaming
- **Room Management**: Manages conversation sessions
- **Agent Integration**: Connects AI agents to conversations
- **Scalability**: Handles multiple concurrent sessions

## 🚀 Setup Options

### Option 1: LiveKit Cloud (Recommended - Easiest)

#### Step 1: Create LiveKit Cloud Account
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Click "Sign Up" or "Get Started"
3. Create an account (you can use GitHub, Google, or email)
4. Verify your email if required

#### Step 2: Create a New Project
1. After logging in, click "Create Project" or "New Project"
2. Give your project a name (e.g., "Confidence Compass")
3. Select a region closest to your users
4. Click "Create Project"

#### Step 3: Get Your Credentials
1. In your project dashboard, you'll see:
   - **Project Overview** with your project details
   - **API Keys** section (usually in the sidebar or settings)
2. Click on "API Keys" or "Keys"
3. You should see:
   - **API Key** (starts with `APIn...`)
   - **API Secret** (starts with `secret...`)
   - **WebSocket URL** (e.g., `wss://your-project.livekit.cloud`)

**Note**: If you don't see API keys immediately, look for:
- "Generate API Key" button
- "Create API Key" option
- "Keys" or "Credentials" tab

#### Step 4: Configure Environment
Add these to your `.env` file:
```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIn...
LIVEKIT_API_SECRET=secret...
```

**Important**: Replace the placeholder values with your actual credentials from the LiveKit Cloud dashboard.

#### Step 5: Test Connection
```bash
# Start your server
npm run dev

# Test the connection
curl http://localhost:5000/api/test/livekit-status
```

### Option 2: Self-Hosted LiveKit Server

#### Step 1: Install Docker
Make sure you have Docker installed on your system.

#### Step 2: Generate API Keys
```bash
# Generate API key and secret
openssl rand -hex 32  # This will be your API key
openssl rand -hex 32  # This will be your API secret
```

#### Step 3: Run LiveKit Server
```bash
# Run LiveKit server locally
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="APIn...: secret..." \
  livekit/livekit-server \
  --dev \
  --bind 0.0.0.0
```

#### Step 4: Configure Environment
```bash
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=APIn...
LIVEKIT_API_SECRET=secret...
```

## 🔧 LiveKit Configuration

### Environment Variables
```bash
# Required for server-side
LIVEKIT_URL=wss://your-livekit-instance.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Optional for frontend
VITE_LIVEKIT_URL=wss://your-livekit-instance.com
```

### Server Configuration
The server uses these LiveKit features:
- **Room Creation**: Dynamic room generation for each session
- **Token Generation**: Secure access tokens for users and agents
- **Agent Integration**: Python voice agent connects to rooms
- **Health Monitoring**: Tracks agent and room status

### Client Configuration
The frontend connects to LiveKit for:
- **Real-time Audio**: Microphone streaming to AI agent
- **Agent Communication**: Receiving AI responses
- **Session Management**: Room joining/leaving
- **Status Monitoring**: Connection health checks

## 🎤 Voice Agent Integration

### How It Works
1. **User Joins Room**: Frontend connects to LiveKit room
2. **Agent Starts**: Python voice agent joins the same room
3. **Audio Streaming**: User's microphone streams to agent
4. **AI Processing**: Agent processes speech and responds
5. **Response Playback**: Agent's voice plays back to user

### Agent Configuration
```python
# In server/livekit-voice-agent.py
session = AgentSession(
    stt=deepgram.STT(model="nova-2", language="en"),
    llm=OpenRouterLLM(model="deepseek/deepseek-chat-v3-0324:free"),
    tts=deepgram.TTS(model="aura-asteria-en"),
    vad=silero.VAD.load(),
)
```

## 🔍 Testing LiveKit Integration

### 1. Health Check
```bash
curl http://localhost:5000/api/test/health
```

### 2. LiveKit Status
```bash
curl http://localhost:5000/api/test/livekit-status
```

### 3. Create Test Room
```bash
curl -X POST http://localhost:5000/api/conversation/create-room \
  -H "Content-Type: application/json" \
  -d '{"topicId": "1"}'
```

### 4. Agent Status
```bash
curl http://localhost:5000/api/test/agent-status
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "LiveKit credentials not configured"
**Solution**: Check your `.env` file has the correct LiveKit credentials

#### 2. "Failed to connect to LiveKit"
**Solution**: 
- Verify your LiveKit URL is correct
- Check if LiveKit Cloud is accessible
- For self-hosted: Ensure Docker container is running

#### 3. "Agent not joining room"
**Solution**:
- Check Python dependencies are installed
- Verify environment variables are passed to agent
- Check agent process logs

#### 4. "No audio in conversation"
**Solution**:
- Grant microphone permissions in browser
- Check audio input devices
- Verify WebRTC is supported

### Debug Commands

#### Check LiveKit Server Status
```bash
# For LiveKit Cloud
curl -I https://your-project.livekit.cloud

# For self-hosted
curl -I http://localhost:7880
```

#### Monitor Agent Processes
```bash
# Check if agent processes are running
ps aux | grep livekit-voice-agent

# Check agent logs
tail -f server.log
```

#### Test WebRTC Connection
```bash
# Test WebSocket connection
wscat -c wss://your-project.livekit.cloud
```

## 📊 LiveKit Monitoring

### Health Metrics
- **Connection Status**: Room connection health
- **Agent Status**: Voice agent process status
- **Audio Quality**: Stream quality metrics
- **Room Count**: Active conversation rooms

### Logs
- **Server Logs**: Express server activity
- **Agent Logs**: Python voice agent output
- **Client Logs**: Frontend connection events
- **Error Logs**: Connection and processing errors

## 🔒 Security Considerations

### Token Security
- **Short-lived Tokens**: Tokens expire after session
- **Room-specific Access**: Tokens only work for specific rooms
- **Identity Verification**: Tokens include user identity

### Network Security
- **HTTPS/WSS**: All connections use secure protocols
- **API Key Protection**: Keys stored in environment variables
- **Rate Limiting**: Prevents abuse of LiveKit resources

## 🚀 Production Deployment

### LiveKit Cloud (Recommended)
1. **Upgrade Plan**: Consider paid plan for production
2. **Custom Domain**: Set up custom domain for your LiveKit instance
3. **Monitoring**: Enable LiveKit Cloud monitoring
4. **Backup**: Configure backup and redundancy

### Self-Hosted Production
1. **Load Balancer**: Set up load balancer for multiple LiveKit instances
2. **SSL/TLS**: Configure SSL certificates
3. **Monitoring**: Set up monitoring and alerting
4. **Backup**: Regular backup of LiveKit configuration

## 📈 Performance Optimization

### Best Practices
1. **Room Cleanup**: Automatically close unused rooms
2. **Agent Management**: Monitor and restart failed agents
3. **Connection Pooling**: Reuse connections when possible
4. **Error Handling**: Graceful handling of connection failures

### Scaling Considerations
- **Multiple Agents**: Run multiple voice agent instances
- **Load Distribution**: Distribute load across LiveKit instances
- **Resource Monitoring**: Monitor CPU and memory usage
- **Auto-scaling**: Automatically scale based on demand

## 🔄 Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep LiveKit SDKs updated
2. **Monitor Logs**: Check for errors and performance issues
3. **Backup Configuration**: Backup LiveKit configuration
4. **Test Connections**: Regular health checks

### Updates
```bash
# Update LiveKit server SDK
npm update livekit-server-sdk

# Update LiveKit client SDK
npm update livekit-client

# Update LiveKit agents
pip install --upgrade livekit-agents
```

## 📞 Support

### LiveKit Resources
- **Official Documentation**: https://docs.livekit.io/
- **LiveKit Cloud**: https://cloud.livekit.io/
- **GitHub Repository**: https://github.com/livekit/livekit
- **Community Discord**: https://discord.gg/livekit

### Getting Help
1. Check the troubleshooting section above
2. Review LiveKit documentation
3. Join the LiveKit Discord community
4. Check LiveKit Cloud status page

This setup ensures reliable real-time communication for the Confidence Compass application, enabling seamless AI conversation practice with immediate feedback. 