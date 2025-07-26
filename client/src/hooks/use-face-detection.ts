/**
 * useFaceDetection Hook
 * 
 * A React hook that provides simple face direction detection using
 * browser-based MediaPipe for practice sessions.
 * 
 * Key Features:
 * - Real-time face direction detection (front, left, right, up, down)
 * - Browser-only implementation (no backend)
 * - Cross-browser compatibility
 * - Visual face mesh overlay
 * 
 * Usage:
 * This hook is used in conversation practice components
 * to provide real-time face direction feedback.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { simpleFaceDetector, FaceDirection } from '../lib/simple-face-detection';

export interface FaceDetectionMetrics {
  direction: 'front' | 'left' | 'right' | 'up' | 'down' | 'unknown';
  confidence: number;
  faceDetected: boolean;
  headPose: { x: number; y: number; z: number };
}

interface UseFaceDetectionOptions {
  enableVisualization?: boolean;
  frameRate?: number;
  enableRealtime?: boolean;
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  isActive: boolean,
  options: UseFaceDetectionOptions = {}
) {
  const {
    enableVisualization = true,
    frameRate = 30,
    enableRealtime = false
  } = options;

  const [faceDirection, setFaceDirection] = useState<FaceDirection>({
    direction: 'unknown',
    confidence: 0,
    faceDetected: false,
    headPose: { x: 0, y: 0, z: 0 }
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    avgProcessingTime: 0,
    frameCount: 0,
    fps: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const performanceHistory = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(0);

  const initializeDetector = useCallback(async () => {
    if (!videoRef.current) {
      console.log('❌ Video ref not available for detector initialization');
      return;
    }

    console.log('🚀 Initializing simple face detector...');
    console.log(`📹 Video ready state: ${videoRef.current.readyState}`);
    console.log(`📹 Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);

    try {
      const success = await simpleFaceDetector.initialize();
      if (success) {
        console.log('✅ Simple face detector initialized successfully');
        
        // Set up real-time processing if enabled
        if (enableRealtime) {
          simpleFaceDetector.setupRealtimeProcessing((result: FaceDirection) => {
            setFaceDirection(result);
            updatePerformanceStats();
          });
        }
        
        setIsInitialized(true);
      } else {
        console.log('❌ Failed to initialize simple face detector');
        setIsInitialized(false);
      }
    } catch (error) {
      console.error('❌ Failed to initialize face detector:', error);
      setIsInitialized(false);
    }
  }, [videoRef, enableRealtime]);

  const updatePerformanceStats = useCallback(() => {
    const currentTime = performance.now();
    const timeDiff = currentTime - lastFrameTime.current;
    const fps = timeDiff > 0 ? 1000 / timeDiff : 0;
    lastFrameTime.current = currentTime;

    setPerformanceStats(prev => ({
      ...prev,
      fps: Math.min(60, Math.max(0, fps)),
      frameCount: prev.frameCount + 1
    }));
  }, []);

  const processFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !isInitialized) {
      return;
    }

    const startTime = performance.now();

    try {
      // Use simple browser-based detection
      const result = await simpleFaceDetector.detectFaceDirection(videoRef.current);
      
      if (result) {
        console.log('✅ Face detection result:', {
          direction: result.direction,
          confidence: result.confidence,
          faceDetected: result.faceDetected
        });

        setFaceDirection(result);

        // Performance tracking
        const processingTime = performance.now() - startTime;
        performanceHistory.current.push(processingTime);
        if (performanceHistory.current.length > 60) {
          performanceHistory.current.shift();
        }

        const avgTime = performanceHistory.current.reduce((a: number, b: number) => a + b, 0) / performanceHistory.current.length;

        setPerformanceStats(prev => ({
          avgProcessingTime: avgTime,
          frameCount: prev.frameCount + 1,
          fps: prev.fps
        }));
      }
    } catch (error) {
      console.error('❌ Error processing frame:', error);
    }

    // Continue processing
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, videoRef, isInitialized]);

  // Initialize detector when video is ready
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      initializeDetector();
    }
  }, [initializeDetector]);

  // Start/stop processing
  useEffect(() => {
    if (isActive && isInitialized) {
      if (enableRealtime) {
        // Real-time mode uses MediaPipe's built-in processing
        console.log('🔄 Starting real-time face detection');
      } else {
        // Manual frame processing mode
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isInitialized, processFrame, enableRealtime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      simpleFaceDetector.destroy();
    };
  }, []);

  // Convert to metrics format for compatibility
  const currentMetrics: FaceDetectionMetrics = {
    direction: faceDirection.direction,
    confidence: faceDirection.confidence,
    faceDetected: faceDirection.faceDetected,
    headPose: faceDirection.headPose
  };

  return {
    faceDirection,
    currentMetrics,
    isInitialized,
    performanceStats,
    canvasRef,
    detectorType: 'browser'
  };
} 