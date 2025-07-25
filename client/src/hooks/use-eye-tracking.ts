/**
 * useEyeTracking Hook
 * 
 * A React hook that provides advanced eye tracking capabilities using both
 * server-side head pose detection (MediaPipe) and client-side simple face detection.
 * This hook manages the eye tracking state, metrics, and real-time analysis.
 * 
 * Key Features:
 * - Real-time eye position tracking
 * - Blink detection and analysis
 * - Gaze direction calculation
 * - Eye movement metrics (saccades, fixations)
 * - Performance optimization
 * - Fallback detection system
 * 
 * Connections:
 * - HeadPoseService: For server-side MediaPipe face detection
 * - SimpleFaceDetector: For client-side fallback detection
 * - useCamera: For video stream access
 * - EyeTrackingMetrics: For metrics calculation
 * 
 * Usage:
 * This hook is used in conversation practice components
 * to provide real-time eye tracking feedback and analysis.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SimpleFaceDetector } from '../lib/simple-face-detection';
import { headPoseService, HeadPoseResult } from '../lib/head-pose-service';

export interface EyeTrackingMetrics {
  eyeContact: number;
  attentionScore: number;
  blinkRate: number;
  headPose: { x: number; y: number; z: number };
  confidence: number;
}

interface UseEyeTrackingOptions {
  enableVisualization?: boolean;
  useSimpleDetector?: boolean;
  frameRate?: number;
  preferServerDetection?: boolean;
}

export function useEyeTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  isActive: boolean,
  options: UseEyeTrackingOptions = {}
) {
  const {
    enableVisualization = true,
    useSimpleDetector = true,
    frameRate = 30,
    preferServerDetection = true
  } = options;

  const [eyeTrackingData, setEyeTrackingData] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState<EyeTrackingMetrics>({
    eyeContact: 0,
    attentionScore: 0,
    blinkRate: 0,
    headPose: { x: 0, y: 0, z: 0 },
    confidence: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    avgProcessingTime: 0,
    frameCount: 0,
    fps: 0
  });
  const [detectorType, setDetectorType] = useState<'server' | 'simple'>('simple');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const simpleDetectorRef = useRef<SimpleFaceDetector | null>(null);
  const performanceHistory = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(0);
  const serverAvailableRef = useRef<boolean>(false);

  const initializeDetector = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      // Check if server-side detection is available
      if (preferServerDetection) {
        const serverAvailable = await headPoseService.checkAvailability();
        serverAvailableRef.current = serverAvailable;
        
        if (serverAvailable) {
          setDetectorType('server');
          setIsInitialized(true);
          console.log('Server-side head pose detection initialized successfully');
          return;
        } else {
          console.log('Server-side detection not available, falling back to simple detector');
        }
      }

      // Initialize simple detector as fallback
      if (!simpleDetectorRef.current) {
        simpleDetectorRef.current = new SimpleFaceDetector();
        await simpleDetectorRef.current.initialize();
      }
      
      setDetectorType('simple');
      setIsInitialized(true);
      console.log('Simple face detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      setIsInitialized(false);
    }
  }, [videoRef, preferServerDetection]);

  const processFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !isInitialized) {
      return;
    }

    const startTime = performance.now();

    try {
      let result: any = null;

      // Try server-side detection first if available
      if (detectorType === 'server' && serverAvailableRef.current) {
        const headPoseResult = await headPoseService.detectHeadPose(videoRef.current);
        
        if (headPoseResult) {
          const metrics = headPoseService.convertToMetrics(headPoseResult);
          result = {
            faceDetected: headPoseResult.face_detected,
            metrics,
            processingTime: performance.now() - startTime,
            landmarks: headPoseResult.landmarks,
            detectorType: 'server'
          };
        } else {
          // Server failed, fallback to simple detector
          console.log('Server detection failed, falling back to simple detector');
          setDetectorType('simple');
          if (!simpleDetectorRef.current) {
            simpleDetectorRef.current = new SimpleFaceDetector();
            await simpleDetectorRef.current.initialize();
          }
        }
      }

      // Use simple detector if server is not available or failed
      if (!result && simpleDetectorRef.current) {
        const simpleResult = await simpleDetectorRef.current.processFrame(videoRef.current);
        result = {
          ...simpleResult,
          detectorType: 'simple'
        };
      }

      if (result) {
        setEyeTrackingData(result);

        // Update metrics
        const metrics: EyeTrackingMetrics = {
          eyeContact: result.metrics.eyeContact.confidence,
          attentionScore: result.metrics.attentionScore,
          blinkRate: result.metrics.blinkRate,
          headPose: result.metrics.headPose || { x: 0, y: 0, z: 0 },
          confidence: result.metrics.confidence
        };

        setCurrentMetrics(metrics);
        setConfidence(result.metrics.confidence);

        // Performance tracking
        const processingTime = performance.now() - startTime;
        performanceHistory.current.push(processingTime);
        if (performanceHistory.current.length > 60) {
          performanceHistory.current.shift();
        }

        const avgTime = performanceHistory.current.reduce((a: number, b: number) => a + b, 0) / performanceHistory.current.length;
        const currentTime = performance.now();
        const timeDiff = currentTime - lastFrameTime.current;
        const fps = timeDiff > 0 ? 1000 / timeDiff : 0;
        lastFrameTime.current = currentTime;

        setPerformanceStats({
          avgProcessingTime: avgTime,
          frameCount: performanceHistory.current.length,
          fps: Math.min(60, Math.max(0, fps))
        });
      }

    } catch (error) {
      console.error('Error processing frame:', error);
    }

    // Continue processing
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, videoRef, isInitialized, detectorType]);

  // Initialize detector when video is ready
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      initializeDetector();
    }
  }, [initializeDetector]);

  // Start/stop processing
  useEffect(() => {
    if (isActive && isInitialized) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
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
  }, [isActive, isInitialized, processFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    eyeTrackingData,
    confidence,
    currentMetrics,
    isInitialized,
    performanceStats,
    canvasRef,
    detectorType
  };
}
