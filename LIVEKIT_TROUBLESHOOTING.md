# LiveKit TURN Server Troubleshooting Guide

## 🚨 **Current Issue: TURN Server Connection Failures**

You're experiencing WebRTC connection failures with LiveKit. This is typically caused by:

1. **Missing LiveKit credentials** - No `.env` file with proper API keys
2. **Network restrictions** - Firewall blocking WebRTC connections
3. **LiveKit service issues** - Cloud service not accessible

## 🔧 **Solution 1: Set Up LiveKit Cloud (Recommended)**

### Step 1: Create LiveKit Cloud Account
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Sign up with GitHub, Google, or email
3. Create a new project
4. Choose a region close to you

### Step 2: Get Your Credentials
1. In your project dashboard, find the "API Keys" section
2. Copy your:
   - **API Key** (starts with `APIn...`)
   - **API Secret** (starts with `secret...`)
   - **WebSocket URL** (e.g., `wss://your-project.livekit.cloud`)

### Step 3: Create Environment File
Create a file named `.env` in the `server/` directory:

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIn...your_actual_key_here
LIVEKIT_API_SECRET=secret...your_actual_secret_here

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Step 4: Restart Server
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## 🔧 **Solution 2: Use Self-Hosted LiveKit (Development)**

### Step 1: Install Docker
Make sure Docker is installed and running.

### Step 2: Run LiveKit Server
```bash
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev \
  --bind 0.0.0.0
```

### Step 3: Create Environment File
Create `.env` in the `server/` directory:

```bash
# LiveKit Configuration (Local)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Other configurations...
DEEPGRAM_API_KEY=your_deepgram_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=5000
NODE_ENV=development
```

## 🔧 **Solution 3: Disable LiveKit (Temporary)**

If you want to test the application without real-time features:

1. **Use Practice Mode**: The practice session doesn't require LiveKit
2. **Test Voice Analysis**: Voice analysis works independently
3. **Test Face Tracking**: Face tracking works without LiveKit

## 🐛 **Common Error Messages & Solutions**

### "TURN server appears to be broken"
- **Cause**: LiveKit not configured or network restrictions
- **Solution**: Set up LiveKit credentials in `.env` file

### "could not establish pc connection"
- **Cause**: WebRTC connection failure
- **Solution**: Check internet connection and firewall settings

### "ICE failed"
- **Cause**: Network traversal issues
- **Solution**: Use LiveKit Cloud (handles TURN servers automatically)

### "Authentication failed"
- **Cause**: Invalid API keys
- **Solution**: Verify your LiveKit credentials

## 🔍 **Testing Your Setup**

### 1. Check Server Status
```bash
curl http://localhost:5000/api/test/health
```

### 2. Test LiveKit Configuration
```bash
node test-livekit.js
```

### 3. Check Environment Variables
```bash
# In your server directory
echo $LIVEKIT_URL
echo $LIVEKIT_API_KEY
```

## 🌐 **Network Troubleshooting**

### Firewall Issues
- **Windows**: Check Windows Firewall settings
- **Corporate Networks**: May block WebRTC ports
- **VPN**: Some VPNs interfere with WebRTC

### Port Requirements
LiveKit uses these ports:
- **7880**: WebSocket (HTTP/HTTPS)
- **7881**: WebSocket (HTTP/HTTPS)
- **7882**: UDP (for media)

### Browser Issues
- **Chrome**: Check `chrome://webrtc-internals/`
- **Firefox**: Check `about:webrtc`
- **Safari**: May have WebRTC limitations

## 📱 **Browser-Specific Solutions**

### Chrome
1. Go to `chrome://webrtc-internals/`
2. Check for ICE connection failures
3. Look for TURN server errors

### Firefox
1. Go to `about:webrtc`
2. Check connection status
3. Look for ICE candidate errors

### Safari
- WebRTC support may be limited
- Try Chrome or Firefox instead

## 🚀 **Quick Fix Checklist**

- [ ] Create `.env` file in `server/` directory
- [ ] Add LiveKit credentials (Cloud or local)
- [ ] Restart the server
- [ ] Clear browser cache
- [ ] Check browser console for errors
- [ ] Test with different browser
- [ ] Check firewall settings

## 📞 **Getting Help**

If you're still having issues:

1. **Check LiveKit Documentation**: https://docs.livekit.io/
2. **LiveKit Community**: https://github.com/livekit/livekit/discussions
3. **Network Diagnostics**: Use browser WebRTC internals
4. **Alternative**: Use practice mode without LiveKit

## 🔄 **Fallback Options**

If LiveKit continues to have issues:

1. **Practice Mode**: Full functionality without AI conversation
2. **Voice Analysis**: Works independently
3. **Face Tracking**: Works without LiveKit
4. **Session Recording**: All features except real-time AI

---

**Note**: The TURN server errors you're seeing are expected when LiveKit is not properly configured. Once you set up the credentials, these errors should resolve. 