# Confidence Compass

A comprehensive platform for improving public speaking and communication skills through AI-powered practice sessions and real-time feedback.

## Features

- Real-time voice analysis and feedback
- Advanced eye tracking for better presentation skills
- AI-powered conversation practice
- Comprehensive metrics and progress tracking
- Mobile-responsive design

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Python (for voice analysis)
- **AI/ML**: Deepgram, MediaPipe
- **Real-time Communication**: LiveKit
- **Storage**: In-Memory (No database required for development)

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide (no database required)
- **[SERVER_SETUP.md](SERVER_SETUP.md)** - Detailed server-side setup and dependencies
- **[LIVEKIT_SETUP.md](LIVEKIT_SETUP.md)** - LiveKit configuration and troubleshooting
- **[FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)** - Frontend architecture and components

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Python 3.11+
- npm or yarn

### Installation

#### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
setup-server.bat
```

**macOS/Linux:**
```bash
chmod +x setup-server.sh
./setup-server.sh
```

#### Option 2: Manual Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd confidencecompass1-main
   ```

2. **Easy Setup** (Recommended):
   ```bash
   npm run start-dev
   ```
   This will automatically:
   - Install dependencies if needed
   - Create a `.env` file with placeholder values
   - Start the development server

3. **Manual Setup**:
   ```bash
   # Install dependencies
   npm install
   pip install -r requirements.txt
   
   # Create .env file (see SETUP.md for details)
   # Start the server
   npm run dev
   ```

4. Open your browser to `http://localhost:5000`

## 🔧 Configuration

### Required API Keys

You'll need to set up these services and add their API keys to your `.env` file:

- **LiveKit** (Real-time communication): [Get from LiveKit Cloud](https://cloud.livekit.io/)
- **Deepgram** (Speech-to-text & TTS): [Get from Deepgram](https://deepgram.com/)
- **OpenRouter** (AI conversation): [Get from OpenRouter](https://openrouter.ai/)

See `SETUP.md` for detailed setup instructions.

## 🎯 What Works Without Database

✅ **Core Features Available**:
- Voice analysis and real-time feedback
- Eye tracking and face detection
- AI conversation practice
- Session recording and metrics
- Progress tracking (in-memory)

✅ **No Database Required**:
- All data stored in memory during runtime
- Sessions persist until server restart
- Perfect for development and testing

## 🏗️ Architecture Overview

### Frontend Components
- **Voice Analysis**: Real-time speech processing and feedback
- **Face Detection**: MediaPipe + fallback detector for eye tracking
- **Practice Sessions**: Multi-modal tracking and feedback
- **LiveKit Integration**: Real-time AI conversation

### Backend Services
- **Express Server**: REST API and static file serving
- **LiveKit Service**: Room management and agent coordination
- **Python Voice Agent**: AI conversation partner
- **In-Memory Storage**: Session and progress tracking

## Development

- Frontend code is in the `client/` directory
- Backend code is in the `server/` directory
- Shared types and utilities are in the `shared/` directory
- Python voice agent is in `server/livekit-voice-agent.py`

## 🐛 Troubleshooting

- **Missing API keys**: Check the System Status panel on the dashboard
- **Camera/Microphone issues**: Ensure browser permissions are granted
- **Python errors**: Make sure Python 3.11+ is installed and dependencies are installed
- **LiveKit issues**: See [LIVEKIT_SETUP.md](LIVEKIT_SETUP.md) for detailed troubleshooting

## 📊 System Status

The application includes a built-in system status panel that shows:
- API key configuration status
- Service connectivity
- Feature availability
- Setup requirements

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[License Type] - See LICENSE file for details
