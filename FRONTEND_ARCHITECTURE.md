# Confidence Compass - Frontend Architecture Guide

This guide provides a comprehensive overview of the frontend architecture, focusing on the critical components for face tracking, voice analysis, and real-time feedback.

## 🏗️ Frontend Architecture Overview

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: React hooks and context
- **Real-time Communication**: LiveKit Client SDK
- **Voice Processing**: Web Audio API + Deepgram
- **Face Detection**: MediaPipe + Custom fallback detector
- **Build Tool**: Vite

## 🎯 Core Components

### 1. Voice Analysis System

#### Enhanced Voice Analyzer (`client/src/lib/enhanced-voice-analyzer.ts`)
**Purpose**: Real-time voice analysis and metrics calculation

**Key Features**:
- **Real-time Processing**: Analyzes audio stream as user speaks
- **Multiple Metrics**: 
  - Speaking pace (words per minute)
  - Volume levels and consistency
  - Filler word detection ("um", "uh", "like")
  - Speech clarity and articulation
  - Voice modulation and pitch
- **Feedback Generation**: Provides actionable feedback based on metrics
- **Session Tracking**: Maintains session statistics

**Key Methods**:
```typescript
class EnhancedVoiceAnalyzer {
  // Initialize with microphone stream
  async initialize(stream: MediaStream): Promise<void>
  
  // Start real-time analysis
  startAnalysis(): void
  
  // Get current metrics
  getMetrics(): EnhancedVoiceMetrics
  
  // Generate feedback
  generateFeedback(): VoiceFeedback[]
}
```

#### Voice Analyzer Hook (`client/src/hooks/use-voice-analyzer.ts`)
**Purpose**: React hook for integrating voice analysis into components

**Features**:
- **Automatic Initialization**: Sets up microphone access
- **Real-time Updates**: Provides live metrics to components
- **Error Handling**: Manages microphone permissions and errors
- **Session Management**: Tracks analysis sessions

**Usage**:
```typescript
const { 
  isAnalyzing, 
  metrics, 
  feedback, 
  startAnalysis, 
  stopAnalysis 
} = useVoiceAnalyzer();
```

### 2. Face Detection & Eye Tracking System

#### MediaPipe Integration (`client/src/lib/mediapipe-utils.ts`)
**Purpose**: Advanced face detection using Google's MediaPipe

**Features**:
- **468 Face Landmarks**: Precise facial feature detection
- **Eye Tracking**: Monitors eye contact and gaze direction
- **Head Pose Estimation**: Tracks head position and orientation
- **Real-time Processing**: 60fps face detection

**Key Methods**:
```typescript
class MediaPipeFaceDetector {
  // Initialize MediaPipe
  async initialize(): Promise<void>
  
  // Process video frame
  async detectFace(video: HTMLVideoElement): Promise<FaceLandmarks>
  
  // Get eye contact metrics
  getEyeContactMetrics(landmarks: FaceLandmarks): EyeContactMetrics
}
```

#### Simple Face Detector (`client/src/lib/simple-face-detection.ts`)
**Purpose**: Fallback face detector when MediaPipe fails

**Features**:
- **Skin Tone Detection**: Basic face detection using color analysis
- **Landmark Estimation**: Approximates facial features
- **Performance Optimized**: Lightweight alternative to MediaPipe
- **Cross-platform**: Works on all browsers

**Key Methods**:
```typescript
class SimpleFaceDetector {
  // Detect face in video frame
  detectFace(video: HTMLVideoElement): SimpleFaceLandmarks
  
  // Draw face outline
  drawFaceOutline(ctx: CanvasRenderingContext2D, landmarks: SimpleFaceLandmarks): void
}
```

#### Eye Tracking Hook (`client/src/hooks/use-eye-tracking.ts`)
**Purpose**: React hook for face and eye tracking

**Features**:
- **Dual Detection**: Uses MediaPipe with SimpleFaceDetector fallback
- **Real-time Feedback**: Provides live eye contact metrics
- **Canvas Integration**: Draws face tracking overlays
- **Performance Monitoring**: Tracks detection accuracy

**Usage**:
```typescript
const { 
  isTracking, 
  landmarks, 
  eyeContactScore, 
  startTracking, 
  stopTracking 
} = useEyeTracking(videoRef, canvasRef);
```

### 3. Practice Session Components

#### Practice Session (`client/src/pages/practice-session.tsx`)
**Purpose**: Main practice interface combining all tracking systems

**Features**:
- **Multi-modal Tracking**: Voice + Face + Eye contact
- **Real-time Feedback**: Live metrics and suggestions
- **Session Recording**: Captures practice data
- **Progress Visualization**: Charts and graphs
- **Camera Integration**: Video feed with overlays

**Key Components**:
```typescript
// Voice analysis integration
const voiceAnalyzer = useVoiceAnalyzer();

// Face tracking integration  
const eyeTracking = useEyeTracking(videoRef, canvasRef);

// Real-time metrics display
const metrics = {
  voice: voiceAnalyzer.metrics,
  face: eyeTracking.landmarks,
  eyeContact: eyeTracking.eyeContactScore
};
```

#### Face Tracking Display (`client/src/components/face-tracking-display.tsx`)
**Purpose**: Visual overlay for face tracking feedback

**Features**:
- **Canvas Overlay**: Draws on top of video feed
- **Landmark Visualization**: Shows detected facial features
- **Eye Contact Indicator**: Visual feedback for eye contact
- **Performance Metrics**: Shows tracking confidence

**Visual Elements**:
- Face outline
- Eye region highlighting
- Head pose indicators
- Confidence score display

### 4. LiveKit Integration

#### LiveKit Room (`client/src/components/conversation/livekit-room.tsx`)
**Purpose**: Real-time conversation with AI agent

**Features**:
- **Room Connection**: Connects to LiveKit server
- **Audio/Video Management**: Handles microphone and camera
- **AI Agent Integration**: Communicates with Python voice agent
- **Session Recording**: Captures conversation data

**Key Methods**:
```typescript
// Connect to conversation room
const connectToRoom = async (roomData: LiveKitSession) => {
  const room = new Room();
  await room.connect(roomData.serverUrl, roomData.token);
};

// Handle AI agent responses
room.on(RoomEvent.DataReceived, (payload: DataPacket) => {
  // Process AI agent messages
});
```

## 🔄 Data Flow Architecture

### 1. Voice Analysis Pipeline
```
Microphone Stream → Web Audio API → Enhanced Voice Analyzer → Metrics → Feedback
```

### 2. Face Detection Pipeline
```
Camera Stream → MediaPipe/Simple Detector → Landmarks → Eye Tracking → Visual Feedback
```

### 3. Real-time Communication Pipeline
```
User Speech → Deepgram STT → OpenRouter LLM → Deepgram TTS → Audio Output
```

## 📊 Metrics & Feedback System

### Voice Metrics
- **Speaking Pace**: Words per minute calculation
- **Volume Consistency**: Audio level analysis
- **Filler Word Count**: "Um", "uh", "like" detection
- **Clarity Score**: Speech articulation measurement
- **Modulation**: Voice pitch and tone variation

### Face Metrics
- **Eye Contact Score**: Percentage of time looking at camera
- **Head Position**: Tracking head orientation
- **Face Visibility**: Detection confidence level
- **Expression Analysis**: Basic emotion detection

### Combined Feedback
- **Real-time Suggestions**: Live improvement tips
- **Session Summary**: End-of-session report
- **Progress Tracking**: Historical performance data
- **Goal Setting**: Personalized improvement targets

## 🎨 UI/UX Components

### Real-time Feedback Display
- **Voice Metrics Panel**: Live speaking statistics
- **Face Tracking Overlay**: Visual face detection
- **Progress Indicators**: Session progress bars
- **Alert System**: Important feedback notifications

### Session Management
- **Topic Selection**: Choose conversation topics
- **Difficulty Settings**: Adjust AI conversation complexity
- **Session Timer**: Track practice duration
- **Recording Controls**: Start/stop session recording

## 🔧 Configuration & Customization

### Environment Variables
```bash
# Frontend environment variables
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
VITE_LIVEKIT_URL=your_livekit_url
```

### Performance Settings
- **Detection Frequency**: Adjust tracking update rate
- **Quality Settings**: Balance accuracy vs performance
- **Fallback Options**: Configure detection fallbacks

## 🐛 Troubleshooting

### Common Issues

1. **Camera Not Working**
   - Check browser permissions
   - Ensure HTTPS or localhost
   - Verify camera availability

2. **Microphone Issues**
   - Grant microphone permissions
   - Check audio input devices
   - Verify Web Audio API support

3. **Face Detection Problems**
   - Ensure good lighting
   - Check camera positioning
   - Try fallback detector

4. **Performance Issues**
   - Reduce detection frequency
   - Lower video quality
   - Close other browser tabs

## 🚀 Performance Optimization

### Best Practices
1. **Efficient Rendering**: Use React.memo and useCallback
2. **Canvas Optimization**: Minimize redraws
3. **Audio Processing**: Use Web Workers for heavy computation
4. **Memory Management**: Clean up resources properly

### Browser Compatibility
- **Chrome/Edge**: Full feature support
- **Firefox**: Most features supported
- **Safari**: Limited MediaPipe support
- **Mobile**: Responsive design with touch controls

## 📈 Analytics & Insights

### Data Collection
- **Session Metrics**: Duration, topics, performance
- **User Behavior**: Interaction patterns, preferences
- **Technical Data**: Performance, errors, device info

### Insights Generated
- **Progress Trends**: Improvement over time
- **Weakness Identification**: Areas needing focus
- **Recommendations**: Personalized improvement suggestions
- **Comparative Analysis**: Benchmark against goals

This architecture provides a robust foundation for real-time voice and face analysis, enabling comprehensive conversation practice with immediate feedback and long-term progress tracking. 