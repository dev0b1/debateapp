import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceMetric } from "@shared/schema";
import { Track, LocalTrack } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

/**
 * Enhanced useVoiceAnalyzer Hook with Session Recording
 * 
 * A React hook that provides comprehensive voice analysis and session recording
 * for detailed post-session feedback and improvement suggestions.
 * 
 * Key Features:
 * - Real-time audio level monitoring
 * - Session recording with timestamps
 * - Filler word detection with timestamps
 * - Speech pattern analysis
 * - Comprehensive feedback data
 * 
 * Connections:
 * - LiveKit: For audio stream handling (optional)
 * 
 * Usage:
 * This hook is used in conversation components to provide
 * comprehensive feedback for post-session analysis.
 */

// Enhanced voice analyzer interface
interface VoiceAnalyzerOptions {
  requireLiveKit?: boolean; // only use LiveKit if true
  enableSessionRecording?: boolean; // record session for feedback
}

// Enhanced voice metrics with timestamps
interface SessionVoiceMetric extends VoiceMetric {
  isSpeaking?: boolean;
  timestamp: number; // precise timestamp
  fillerWords?: Array<{
    word: string;
    timestamp: number;
    confidence: number;
  }>;
  speechPatterns?: {
    pace: 'slow' | 'normal' | 'fast';
    volume: 'quiet' | 'normal' | 'loud';
    clarity: 'unclear' | 'clear' | 'excellent';
  };
}

// Session recording data
interface SessionRecording {
  startTime: number;
  endTime: number;
  duration: number;
  voiceMetrics: SessionVoiceMetric[];
  fillerWords: Array<{
    word: string;
    timestamp: number;
    confidence: number;
  }>;
  speakingTime: number;
  silenceTime: number;
  volumeVariations: Array<{
    timestamp: number;
    volume: number;
    type: 'peak' | 'valley' | 'normal';
  }>;
  speechSegments: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    averageVolume: number;
    clarity: number;
  }>;
}

export function useVoiceAnalyzer(options: VoiceAnalyzerOptions = {}) {
  // Only use LiveKit room context if required
  const room = options.requireLiveKit ? useRoomContext() : undefined;
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMetrics, setVoiceMetrics] = useState<SessionVoiceMetric[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<SessionRecording | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const sessionStartTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const speechSegmentsRef = useRef<Array<{start: number; end: number}>>([]);

  // Filler words to detect with confidence thresholds
  const FILLER_WORDS = [
    { word: 'um', confidence: 0.7 },
    { word: 'uh', confidence: 0.7 },
    { word: 'like', confidence: 0.6 },
    { word: 'you know', confidence: 0.6 },
    { word: 'basically', confidence: 0.5 },
    { word: 'actually', confidence: 0.5 },
    { word: 'literally', confidence: 0.5 },
    { word: 'sort of', confidence: 0.5 },
    { word: 'kind of', confidence: 0.5 },
    { word: 'i mean', confidence: 0.5 },
    { word: 'right', confidence: 0.4 },
    { word: 'so', confidence: 0.4 },
    { word: 'well', confidence: 0.4 },
    { word: 'okay', confidence: 0.4 }
  ];

  const connectToLivekitAudio = useCallback(async () => {
    if (!room || !audioContextRef.current) return;

    try {
      // Get the local audio track from the room
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (!audioTrack) {
        console.error('No audio track available from LiveKit room');
        return;
      }

      // Get the MediaStreamTrack from LiveKit track
      const mediaStreamTrack = audioTrack.mediaStreamTrack;
      if (!mediaStreamTrack) {
        console.error('No MediaStreamTrack available from LiveKit audio track');
        return;
      }

      // Create a MediaStream from the track
      const mediaStream = new MediaStream([mediaStreamTrack]);
      streamRef.current = mediaStream;

      // Create audio context and analyzer
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }

      // Connect the audio track to the analyzer
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);

      // Start analysis
      analyzeAudio();
    } catch (error) {
      console.error('Failed to connect to LiveKit audio:', error);
    }
  }, [room]);

  const detectFillerWords = useCallback((audioData: Float32Array, timestamp: number): Array<{word: string; timestamp: number; confidence: number}> => {
    const detected: Array<{word: string; timestamp: number; confidence: number}> = [];
    
    // Analyze audio patterns for filler word detection
    const variance = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length;
    const mean = audioData.reduce((sum, val) => sum + val, 0) / audioData.length;
    
    // Simple heuristics for filler word detection
    if (variance < 0.01 && Math.abs(mean) < 0.05) {
      // Low variance and mean might indicate "um" or "uh"
      detected.push({
        word: 'um',
        timestamp,
        confidence: 0.7
      });
    }
    
    if (variance > 0.1 && mean > 0.1) {
      // High variance and positive mean might indicate "like" or "you know"
      detected.push({
        word: 'like',
        timestamp,
        confidence: 0.6
      });
    }
    
    return detected;
  }, []);

  const analyzeSpeechPatterns = useCallback((volume: number, clarity: number, pace: number) => {
    return {
      pace: pace < 30 ? 'slow' as const : pace > 70 ? 'fast' as const : 'normal' as const,
      volume: volume < 30 ? 'quiet' as const : volume > 80 ? 'loud' as const : 'normal' as const,
      clarity: clarity < 40 ? 'unclear' as const : clarity > 80 ? 'excellent' as const : 'clear' as const
    };
  }, []);

  const analyzeAudio = useCallback(async () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate basic volume level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const volume = Math.min(100, (average / 128) * 100);
    setAudioLevel(volume);

    const currentTime = Date.now();
    const sessionTime = currentTime - sessionStartTimeRef.current;

    // Determine speaking status
    const currentlySpeaking = volume > 15;
    setIsSpeaking(currentlySpeaking);

    // Track speech segments
    if (currentlySpeaking && !isSpeaking) {
      // Started speaking
      speechSegmentsRef.current.push({ start: sessionTime, end: 0 });
    } else if (!currentlySpeaking && isSpeaking) {
      // Stopped speaking
      if (speechSegmentsRef.current.length > 0) {
        const lastSegment = speechSegmentsRef.current[speechSegmentsRef.current.length - 1];
        lastSegment.end = sessionTime;
      }
    }

    // Convert to Float32Array for analysis
    const floatData = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      floatData[i] = (dataArray[i] - 128) / 128;
    }

    // Store audio buffer for analysis
    audioBufferRef.current.push(floatData);
    if (audioBufferRef.current.length > 50) {
      audioBufferRef.current.shift();
    }

    // Perform enhanced voice analysis
    if (audioBufferRef.current.length >= 10) {
      try {
        setIsAnalyzing(true);
        
        // Calculate basic metrics
        const pitch = calculateBasicPitch(dataArray);
        const clarity = calculateBasicClarity(dataArray, volume);
        const pace = calculateBasicPace();
        
        // Detect filler words
        const detectedFillerWords = detectFillerWords(floatData, sessionTime);
        
        // Analyze speech patterns
        const speechPatterns = analyzeSpeechPatterns(volume, clarity, pace);

        // Create enhanced voice metric
        const enhancedMetric: SessionVoiceMetric = {
          volume,
          pitch,
          clarity,
          pace,
          isSpeaking: currentlySpeaking,
          timestamp: sessionTime,
          fillerWords: detectedFillerWords,
          speechPatterns
        };

        setVoiceMetrics(prev => [...prev, enhancedMetric]);
      } catch (error) {
        console.error('Enhanced analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }

    // Continue the animation frame loop
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [detectFillerWords, analyzeSpeechPatterns]);

  const calculateBasicPitch = (dataArray: Uint8Array): number => {
    // Basic pitch detection using peak finding
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    
    // Convert to pitch score (simplified)
    return Math.min(100, Math.max(0, (maxIndex / dataArray.length) * 100));
  };

  const calculateBasicClarity = (dataArray: Uint8Array, volume: number): number => {
    // Basic clarity calculation
    const variance = dataArray.reduce((sum, value) => sum + (value - 128) * (value - 128), 0) / dataArray.length;
    const clarityScore = Math.min(100, Math.max(0, (variance / 1000) * 100));
    
    return clarityScore;
  };

  const calculateBasicPace = (): number => {
    // Estimate speaking pace based on audio level changes
    if (voiceMetrics.length < 10) return 50;
    
    const recentMetrics = voiceMetrics.slice(-10);
    let changes = 0;
    
    for (let i = 1; i < recentMetrics.length; i++) {
      if (Math.abs(recentMetrics[i].volume - recentMetrics[i-1].volume) > 10) {
        changes++;
      }
    }
    
    // Normalize to 0-100 scale
    return Math.min(100, (changes / 9) * 100);
  };

  const startRecording = useCallback(async () => {
    try {
      // Initialize session recording
      sessionStartTimeRef.current = Date.now();
      speechSegmentsRef.current = [];
      
      // Try to use LiveKit audio track first
      if (room) {
        await connectToLivekitAudio();
      } else {
        // Fallback to getting microphone access directly
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        streamRef.current = stream;
        
        // Initialize audio context and analyzer
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }
      
      setIsRecording(true);
      analyzeAudio();

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [connectToLivekitAudio, room, analyzeAudio]);

  const stopRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Create comprehensive session recording
    const endTime = Date.now();
    const duration = endTime - sessionStartTimeRef.current;
    
    const allFillerWords = voiceMetrics
      .flatMap(metric => metric.fillerWords || [])
      .sort((a, b) => a.timestamp - b.timestamp);

    const speakingTime = speechSegmentsRef.current.reduce((total, segment) => {
      return total + (segment.end - segment.start);
    }, 0);

    const volumeVariations = voiceMetrics
      .filter(metric => metric.volume > 60 || metric.volume < 20)
      .map(metric => ({
        timestamp: metric.timestamp,
        volume: metric.volume,
        type: metric.volume > 60 ? 'peak' as const : 'valley' as const
      }));

    const speechSegments = speechSegmentsRef.current
      .filter(segment => segment.end > 0)
      .map(segment => {
        const segmentMetrics = voiceMetrics.filter(
          metric => metric.timestamp >= segment.start && metric.timestamp <= segment.end
        );
        const avgVolume = segmentMetrics.reduce((sum, m) => sum + m.volume, 0) / segmentMetrics.length;
        const avgClarity = segmentMetrics.reduce((sum, m) => sum + m.clarity, 0) / segmentMetrics.length;
        
        return {
          startTime: segment.start,
          endTime: segment.end,
          duration: segment.end - segment.start,
          averageVolume: avgVolume,
          clarity: avgClarity
        };
      });

    const sessionData: SessionRecording = {
      startTime: sessionStartTimeRef.current,
      endTime,
      duration,
      voiceMetrics,
      fillerWords: allFillerWords,
      speakingTime,
      silenceTime: duration - speakingTime,
      volumeVariations,
      speechSegments
    };

    setSessionRecording(sessionData);
    setIsRecording(false);
    setIsAnalyzing(false);
    setIsSpeaking(false);
    audioBufferRef.current = [];
  }, [voiceMetrics]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsRecording(audioTrack.enabled);
      }
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setVoiceMetrics([]);
    setSessionRecording(null);
    audioBufferRef.current = [];
    speechSegmentsRef.current = [];
  }, []);

  const getVoiceAnalysisSummary = useCallback(() => {
    if (voiceMetrics.length === 0) return null;

    const recent = voiceMetrics.slice(-20);
    const avgVolume = recent.reduce((sum, m) => sum + m.volume, 0) / recent.length;
    const speakingTime = recent.filter(m => m.isSpeaking).length / recent.length * 100;

    return {
      averageVolume: Math.round(avgVolume),
      speakingTime: Math.round(speakingTime),
      sampleCount: recent.length
    };
  }, [voiceMetrics]);

  const getSessionFeedback = useCallback(() => {
    if (!sessionRecording) return null;

    const totalFillerWords = sessionRecording.fillerWords.length;
    const avgVolume = sessionRecording.voiceMetrics.reduce((sum, m) => sum + m.volume, 0) / sessionRecording.voiceMetrics.length;
    const speakingPercentage = (sessionRecording.speakingTime / sessionRecording.duration) * 100;
    
    // Analyze patterns
    const volumeIssues = sessionRecording.volumeVariations.length;
    const clarityIssues = sessionRecording.voiceMetrics.filter(m => m.clarity < 50).length;
    const paceIssues = sessionRecording.voiceMetrics.filter(m => m.pace > 70 || m.pace < 30).length;

    return {
      duration: sessionRecording.duration,
      totalFillerWords,
      averageVolume: Math.round(avgVolume),
      speakingPercentage: Math.round(speakingPercentage),
      volumeIssues,
      clarityIssues,
      paceIssues,
      speechSegments: sessionRecording.speechSegments.length,
      fillerWords: sessionRecording.fillerWords,
      volumeVariations: sessionRecording.volumeVariations,
      voiceMetrics: sessionRecording.voiceMetrics
    };
  }, [sessionRecording]);

  return {
    // Basic metrics
    audioLevel,
    isRecording,
    voiceMetrics,
    isSpeaking,
    
    // Session recording
    sessionRecording,
    
    // Controls
    startRecording,
    stopRecording,
    toggleMute,
    resetAnalysis,
    
    // Analysis
    getVoiceAnalysisSummary,
    getSessionFeedback,
    
    // Status
    isAnalyzing
  };
}
